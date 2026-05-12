'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useEffect, useReducer } from 'react'

import { ModelSelector } from '@/components/features/agents/model-selector'
import { LazarusLoader } from '@/components/ui/lazarus-loader'
import { useAuth } from '@/hooks/auth/use-auth'
import { AgentEvents, useAppEvents } from '@/hooks/core/use-app-events'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useWorkspaceMCPs } from '@/hooks/features/mcp/use-workspace-mcps'
import { useTheme } from '@/hooks/ui/use-theme'
import { useWorkspaceConfig } from '@/hooks/workspace/use-workspace-config'
import { DEFAULT_MODEL, type TSupportedModel } from '@/lib/agent-models'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { buildAgentTriggerWebhookUrl } from '@/lib/webhook-url'
import { ClaudeCodeAgent } from '@/model/claude-code-agent'

import { GUARDRAIL_PRESETS } from './guardrails/guardrail-presets'
import type { GuardrailConfig } from './guardrails/guardrail-types'
import { WizardNavFooter } from './wizard-components/wizard-nav-footer'
import { WizardStepIndicator } from './wizard-components/wizard-step-indicator'
import { StepGuardrails } from './wizard-steps/step-guardrails'
import { AVAILABLE_TOOLS, StepIdentity } from './wizard-steps/step-identity'
import {
  StepSchedule,
  type TriggerConfig,
  buildCron,
} from './wizard-steps/step-schedule'

// ── Reducer ────────────────────────────────────────────────

interface WizardState {
  step: number
  direction: number // 1 = forward, -1 = back
  name: string
  systemPrompt: string
  model: TSupportedModel
  allowedTools: string[]
  activeMCPs: string[]
  triggers: TriggerConfig[]
  guardrails: GuardrailConfig[]
  isSubmitting: boolean
  error: string | null
}

type WizardAction =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SKIP' }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_SYSTEM_PROMPT'; payload: string }
  | { type: 'SET_MODEL'; payload: TSupportedModel }
  | { type: 'TOGGLE_TOOL'; payload: string }
  | { type: 'TOGGLE_MCP'; payload: string }
  | { type: 'SET_MCPS'; payload: string[] }
  | { type: 'SET_TRIGGERS'; payload: TriggerConfig[] }
  | { type: 'SET_GUARDRAILS'; payload: GuardrailConfig[] }
  | { type: 'START_SUBMIT' }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'RESET_ERROR' }

const initialState: WizardState = {
  step: 0,
  direction: 1,
  name: '',
  systemPrompt: '',
  model: DEFAULT_MODEL,
  allowedTools: [...AVAILABLE_TOOLS],
  activeMCPs: [],
  triggers: [],
  guardrails: GUARDRAIL_PRESETS[1].config, // Supervised preset
  isSubmitting: false,
  error: null,
}

type WizardHandler<A extends WizardAction = WizardAction> = (
  state: WizardState,
  action: A,
) => WizardState

const wizardHandlers: {
  [K in WizardAction['type']]: WizardHandler<Extract<WizardAction, { type: K }>>
} = {
  NEXT: (state) => ({
    ...state,
    step: Math.min(state.step + 1, 2),
    direction: 1,
    error: null,
  }),
  BACK: (state) => ({
    ...state,
    step: Math.max(state.step - 1, 0),
    direction: -1,
    error: null,
  }),
  SKIP: (state) => ({
    ...state,
    step: Math.min(state.step + 1, 2),
    direction: 1,
    error: null,
  }),
  SET_NAME: (state, action) => ({ ...state, name: action.payload }),
  SET_SYSTEM_PROMPT: (state, action) => ({
    ...state,
    systemPrompt: action.payload,
  }),
  SET_MODEL: (state, action) => ({ ...state, model: action.payload }),
  TOGGLE_TOOL: (state, action) => {
    const tools = state.allowedTools.includes(action.payload)
      ? state.allowedTools.filter((t) => t !== action.payload)
      : [...state.allowedTools, action.payload]
    return { ...state, allowedTools: tools }
  },
  TOGGLE_MCP: (state, action) => {
    const mcps = state.activeMCPs.includes(action.payload)
      ? state.activeMCPs.filter((m) => m !== action.payload)
      : [...state.activeMCPs, action.payload]
    return { ...state, activeMCPs: mcps }
  },
  SET_MCPS: (state, action) => ({ ...state, activeMCPs: action.payload }),
  SET_TRIGGERS: (state, action) => ({ ...state, triggers: action.payload }),
  SET_GUARDRAILS: (state, action) => ({ ...state, guardrails: action.payload }),
  START_SUBMIT: (state) => ({ ...state, isSubmitting: true, error: null }),
  SUBMIT_ERROR: (state, action) => ({
    ...state,
    isSubmitting: false,
    error: action.payload,
  }),
  RESET_ERROR: (state) => ({ ...state, error: null }),
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  const handler = wizardHandlers[action.type] as WizardHandler | undefined
  return handler ? handler(state, action) : state
}

// ── Slug utility ───────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Transition config ──────────────────────────────────────

const stepTransition = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as const,
}

// ── Component ──────────────────────────────────────────────

interface CreateAgentWizardProps {
  onSave: (agent: Partial<ClaudeCodeAgent>) => Promise<void>
  onClose: () => void
}

export function CreateAgentWizard({
  onSave,
  onClose: _onClose,
}: CreateAgentWizardProps) {
  const { isDark } = useTheme()
  const { session } = useAuth()
  const { selectedWorkspace } = useWorkspace()
  const { emit } = useAppEvents<AgentEvents>()
  const userId = session?.user?.id
  const workspaceId = selectedWorkspace?.id

  const { config: workspaceConfig } = useWorkspaceConfig(
    workspaceId || '',
    userId || '',
  )

  const [state, dispatch] = useReducer(wizardReducer, initialState)

  const {
    allMCPs: availableMCPs,
    enabledMCPs,
    loading: loadingMCPs,
  } = useWorkspaceMCPs(workspaceId)

  // Auto-select all enabled MCPs when they load
  useEffect(() => {
    if (enabledMCPs.length > 0) {
      dispatch({ type: 'SET_MCPS', payload: enabledMCPs.map((m) => m.name) })
    }
  }, [enabledMCPs])

  // Derived values
  const agentId = slugify(state.name)
  const agentEmail =
    workspaceConfig?.slug && agentId
      ? `${agentId}@${workspaceConfig.slug}.lazarusconnect.com`
      : agentId
        ? `${agentId}@lazarusconnect.com`
        : '@lazarusconnect.com'

  const canProceedStep0 =
    state.name.trim().length > 0 && state.systemPrompt.trim().length > 0

  // Submit handler
  const handleSubmit = async () => {
    dispatch({ type: 'START_SUBMIT' })
    try {
      // Build agent data
      const agentData: Partial<ClaudeCodeAgent> = {
        id: agentId,
        name: state.name,
        systemPrompt: state.systemPrompt,
        allowedTools: state.allowedTools,
        activeMCPs: state.activeMCPs,
        autoTriggerEmail: true,
        modelConfig: {
          model: state.model,
          temperature: 0.5,
        },
        workspaceId: workspaceId || '',
        scope: 'user',
        agentType: 'lazarus',
        guardrails: state.guardrails,
      } as any

      // Create the agent
      await onSave(agentData)

      // If triggers are configured, create them
      if (state.triggers.length > 0 && workspaceId) {
        for (const trigger of state.triggers) {
          const config: any = {
            task: trigger.taskDescription || 'Execute agent task',
          }

          if (trigger.type === 'scheduled') {
            if (trigger.repeatType === 'once') {
              config.schedule = {
                type: 'once',
                expression: trigger.onceDateTime,
                timezone: trigger.timezone,
              }
            } else {
              config.schedule = buildCron(
                trigger.repeatType,
                trigger.scheduleTime,
                trigger.selectedDays,
                trigger.monthDay,
                trigger.timezone,
              )
            }
          } else if (trigger.type === 'webhook') {
            config.secret = trigger.webhookSecret || undefined
          } else if (trigger.type === 'whatsapp') {
            config.conditions = {
              fromNumbers: trigger.whatsappFromNumbers
                ? trigger.whatsappFromNumbers
                    .split(',')
                    .map((n: string) => n.trim())
                    .filter(Boolean)
                : undefined,
              containsKeywords: trigger.whatsappKeywords
                ? trigger.whatsappKeywords
                    .split(',')
                    .map((k: string) => k.trim())
                    .filter(Boolean)
                : undefined,
              messageTypes:
                trigger.whatsappMessageTypes.length > 0
                  ? trigger.whatsappMessageTypes
                  : undefined,
            }
          }

          const triggerName =
            trigger.type === 'webhook'
              ? 'Webhook trigger'
              : trigger.type === 'whatsapp'
                ? 'WhatsApp trigger'
                : trigger.taskDescription || 'Scheduled task'

          try {
            const result = await api.post<{
              trigger: { id: string }
            }>(`/api/workspaces/${workspaceId}/agents/${agentId}/triggers`, {
              type: trigger.type,
              name: triggerName,
              config,
              enabled: true,
            })

            if (trigger.type === 'webhook' && (result as any)?.trigger?.id) {
              emit('webhookCreated', {
                webhookUrl: buildAgentTriggerWebhookUrl(
                  workspaceId,
                  agentId,
                  (result as any).trigger.id,
                ),
              })
            }
          } catch (triggerError) {
            console.error('Failed to create trigger:', triggerError)
          }
        }
      }
    } catch (error) {
      dispatch({
        type: 'SUBMIT_ERROR',
        payload:
          error instanceof Error ? error.message : 'Failed to create agent',
      })
    }
  }

  // Submitting state
  if (state.isSubmitting) {
    return (
      <div className='flex h-full items-center justify-center'>
        <LazarusLoader />
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Step indicator */}
      <WizardStepIndicator currentStep={state.step} isDark={isDark} />

      {/* Step content */}
      <div className='relative flex-1 overflow-y-auto px-6'>
        {/* Step title — only for steps with headings */}
        <AnimatePresence mode='wait' initial={false}>
          {state.step > 0 && (
            <m.div
              key={`title-${state.step}`}
              initial={{ opacity: 0, x: state.direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: state.direction * -40 }}
              transition={stepTransition}>
              <h2 className='text-[16px] font-semibold tracking-[-0.01em]'>
                {state.step === 1 ? 'Plan' : 'Guardrails'}
              </h2>
              {state.step === 1 && (
                <p
                  className={cn(
                    'mb-6 mt-1.5 text-[14px] font-medium leading-relaxed',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}>
                  Automate your agent. Schedule recurring tasks, respond to app
                  events, or react to incoming messages.
                </p>
              )}
              {state.step === 2 && (
                <p
                  className={cn(
                    'mb-6 mt-1.5 text-[14px] font-medium leading-relaxed',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}>
                  Agents work autonomously and only loop you in when a decision
                  needs your call.
                </p>
              )}
            </m.div>
          )}
        </AnimatePresence>

        {/* Step content with slide transition */}
        <AnimatePresence mode='wait' initial={false}>
          <m.div
            key={`step-${state.step}`}
            initial={{
              x: state.direction * 80,
              opacity: 0,
              filter: 'blur(4px)',
            }}
            animate={{
              x: 0,
              opacity: 1,
              filter: 'blur(0px)',
            }}
            exit={{
              x: state.direction * -80,
              opacity: 0,
              filter: 'blur(4px)',
            }}
            transition={stepTransition}
            className='mx-auto max-w-3xl pb-8'>
            {state.step === 0 && (
              <div className='space-y-5'>
                <StepIdentity
                  name={state.name}
                  systemPrompt={state.systemPrompt}
                  allowedTools={state.allowedTools}
                  activeMCPs={state.activeMCPs}
                  availableMCPs={availableMCPs}
                  loadingMCPs={loadingMCPs}
                  agentEmail={agentEmail}
                  isDark={isDark}
                  onNameChange={(v) =>
                    dispatch({ type: 'SET_NAME', payload: v })
                  }
                  onSystemPromptChange={(v) =>
                    dispatch({ type: 'SET_SYSTEM_PROMPT', payload: v })
                  }
                  onToggleTool={(v) =>
                    dispatch({ type: 'TOGGLE_TOOL', payload: v })
                  }
                  onToggleMCP={(v) =>
                    dispatch({ type: 'TOGGLE_MCP', payload: v })
                  }
                />
                <ModelSelector
                  value={state.model}
                  onChange={(m) => dispatch({ type: 'SET_MODEL', payload: m })}
                  isDark={isDark}
                  size='medium'
                />
              </div>
            )}

            {state.step === 1 && (
              <StepSchedule
                triggers={state.triggers}
                onTriggersChange={(t) =>
                  dispatch({ type: 'SET_TRIGGERS', payload: t })
                }
                isDark={isDark}
              />
            )}

            {state.step === 2 && (
              <StepGuardrails
                guardrails={state.guardrails}
                onGuardrailsChange={(g) =>
                  dispatch({ type: 'SET_GUARDRAILS', payload: g })
                }
                isDark={isDark}
              />
            )}
          </m.div>
        </AnimatePresence>

        {/* Error message */}
        {state.error && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'mx-auto max-w-3xl rounded-md border px-4 py-3 text-[13px]',
              isDark
                ? 'border-red-500/20 bg-red-500/10 text-red-400'
                : 'border-red-500/20 bg-red-50 text-red-600',
            )}>
            {state.error}
          </m.div>
        )}
      </div>

      {/* Navigation footer */}
      <WizardNavFooter
        currentStep={state.step}
        totalSteps={3}
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={() => dispatch({ type: 'NEXT' })}
        onSkip={() => dispatch({ type: 'SKIP' })}
        onSubmit={handleSubmit}
        isSubmitting={state.isSubmitting}
        canProceed={state.step === 0 ? canProceedStep0 : true}
        isDark={isDark}
      />
    </div>
  )
}
