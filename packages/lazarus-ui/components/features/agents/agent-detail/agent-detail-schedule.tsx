'use client'

import {
  RiAddLine,
  RiArrowLeftSLine,
  RiPlayLine,
  RiStopFill,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { LexicalEditor } from '@/components/ui/lexical/lexical-editor'
import { EditorModePlugin } from '@/components/ui/lexical/plugins/editor-mode-plugin'
import '@/components/ui/lexical/xcode-theme.css'
import { OptionList, type OptionItem } from '@/components/ui/option-list'
import { SegmentedControl } from '@/components/ui/segmented-control'
import Spinner from '@/components/ui/spinner'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useCreateTrigger } from '@/hooks/features/agents/use-create-trigger'
import { useDeleteTrigger } from '@/hooks/features/agents/use-delete-trigger'
import { useStopExecution } from '@/hooks/features/agents/use-execution-control'
import { useGetTriggers } from '@/hooks/features/agents/use-get-triggers'
import { useRunTrigger } from '@/hooks/features/agents/use-run-trigger'
import { useUpdateTrigger } from '@/hooks/features/agents/use-update-trigger'
import { useCopyToClipboard } from '@/hooks/ui/interaction/use-copy-to-clipboard'
import { useTheme } from '@/hooks/ui/use-theme'
import { useAgentStatus } from '@/hooks/use-agent-status'
import { cn } from '@/lib/utils'
import { buildAgentTriggerWebhookUrl } from '@/lib/webhook-url'

import { AgentEvents, useAppEvents } from '@/hooks/core/use-app-events'

import {
  getDefaultTimezone,
  getTimezoneAbbreviation,
} from '@/lib/timezone-utils'

import {
  buildCron,
  createEmptyTrigger,
  TimezoneSelector,
  type TriggerConfig,
} from '../wizard-steps/step-schedule'

// ── Motion constants ────────────────────────────────────────

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

const staggerParent = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
}

const fadeBlurChild = {
  hidden: { opacity: 0, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
}

// ── Custom icons ────────────────────────────────────────────

function ScheduleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}>
      <circle cx='12' cy='12' r='10' />
      <path d='M12 6v6l4 2' />
    </svg>
  )
}

function SignalIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}>
      <polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2' />
    </svg>
  )
}

function MessageBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}>
      <path d='M7.9 20A9 9 0 1 0 4 16.1L2 22z' />
    </svg>
  )
}

const TRIGGER_ICON_MAP: Record<TriggerConfig['type'], typeof ScheduleIcon> = {
  scheduled: ScheduleIcon,
  webhook: SignalIcon,
  whatsapp: MessageBubbleIcon,
}

// ── Constants ───────────────────────────────────────────────

const TRIGGER_TYPES = [
  { id: 'scheduled' as const, label: 'Schedule' },
  { id: 'webhook' as const, label: 'App Signal' },
  { id: 'whatsapp' as const, label: 'WhatsApp' },
]

const REPEAT_OPTIONS = [
  { id: 'every-30min' as const, label: '30 min' },
  { id: 'every-hour' as const, label: 'Hourly' },
  { id: 'daily' as const, label: 'Daily' },
  { id: 'weekdays' as const, label: 'Weekdays' },
  { id: 'specific-days' as const, label: 'Custom' },
  { id: 'monthly' as const, label: 'Monthly' },
  { id: 'once' as const, label: 'Once' },
]

const DAYS = [
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
  { value: 0, label: 'S' },
]

const MONTH_DAYS = [
  { value: '1', label: '1st' },
  { value: '2', label: '2nd' },
  { value: '3', label: '3rd' },
  { value: '5', label: '5th' },
  { value: '10', label: '10th' },
  { value: '15', label: '15th' },
  { value: '20', label: '20th' },
  { value: '25', label: '25th' },
  { value: 'L', label: 'Last' },
]

// ── Types ───────────────────────────────────────────────────

type PlanTrigger = TriggerConfig & {
  _apiId?: string
  _enabled?: boolean
}

interface ApiTrigger {
  id: string
  name?: string
  type: 'scheduled' | 'email' | 'webhook' | 'external' | 'whatsapp'
  agentId: string
  workspaceId: string
  enabled: boolean
  config: any
  createdAt: string
}

// ── Conversion helpers ──────────────────────────────────────

function parseCronToConfig(schedule: any): Partial<TriggerConfig> {
  if (!schedule) return {}
  const tz = schedule.timezone || getDefaultTimezone()
  if (schedule.type === 'once') {
    return {
      repeatType: 'once',
      onceDateTime: schedule.expression || '',
      timezone: tz,
    }
  }
  const expr = schedule.expression
  if (!expr) return { timezone: tz }
  if (expr === '*/30 * * * *')
    return { repeatType: 'every-30min', timezone: tz }
  if (expr === '0 * * * *') return { repeatType: 'every-hour', timezone: tz }
  const parts = expr.split(' ')
  if (parts.length !== 5) return { timezone: tz }
  const [min, hour, dom, , dow] = parts
  const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  if (dom !== '*') {
    return {
      repeatType: 'monthly',
      monthDay: dom,
      scheduleTime: time,
      timezone: tz,
    }
  }
  if (dow === '*')
    return { repeatType: 'daily', scheduleTime: time, timezone: tz }
  if (dow === '1-5')
    return { repeatType: 'weekdays', scheduleTime: time, timezone: tz }
  const days = dow.split(',').map(Number)
  return {
    repeatType: 'specific-days',
    selectedDays: days,
    scheduleTime: time,
    timezone: tz,
  }
}

// ── Config extractors (API → UI) ──────────────────────────

type ConfigExtractor = (apiConfig: any) => Partial<TriggerConfig>

const configExtractors: Record<string, ConfigExtractor> = {
  scheduled: (c) => parseCronToConfig(c?.schedule),
  webhook: (c) => ({
    webhookSecret: c?.secret || '',
    webhookSignatureHeader: c?.signatureHeader || '',
  }),
  whatsapp: (c) => ({
    whatsappFromNumbers: c?.conditions?.fromNumbers?.join(', ') || '',
    whatsappKeywords: c?.conditions?.containsKeywords?.join(', ') || '',
    whatsappMessageTypes: c?.conditions?.messageTypes || ['text'],
  }),
}

function apiTriggerToConfig(t: ApiTrigger): PlanTrigger {
  const base = createEmptyTrigger()
  const type =
    t.type === 'email' || t.type === 'external'
      ? 'webhook'
      : (t.type as TriggerConfig['type'])

  const config: PlanTrigger = {
    ...base,
    _apiId: t.id,
    _enabled: t.enabled,
    type,
    taskTitle: t.name || '',
    taskDescription: t.config?.task || '',
    ...configExtractors[type]?.(t.config),
  }

  return config
}

// ── Config builders (UI → API) ────────────────────────────

type ConfigBuilder = (trigger: PlanTrigger) => Record<string, any>

const configBuilders: Record<string, ConfigBuilder> = {
  scheduled: (t) =>
    t.repeatType === 'once'
      ? {
          schedule: {
            type: 'once',
            expression: t.onceDateTime,
            timezone: t.timezone,
          },
        }
      : {
          schedule: buildCron(
            t.repeatType,
            t.scheduleTime,
            t.selectedDays,
            t.monthDay,
            t.timezone,
          ),
        },
  webhook: (t) => ({
    secret: t.webhookSecret || undefined,
    signatureHeader: t.webhookSignatureHeader || undefined,
  }),
  whatsapp: (t) => ({
    conditions: {
      fromNumbers: t.whatsappFromNumbers
        ? t.whatsappFromNumbers
            .split(',')
            .map((n: string) => n.trim())
            .filter(Boolean)
        : undefined,
      containsKeywords: t.whatsappKeywords
        ? t.whatsappKeywords
            .split(',')
            .map((k: string) => k.trim())
            .filter(Boolean)
        : undefined,
      messageTypes:
        t.whatsappMessageTypes.length > 0 ? t.whatsappMessageTypes : undefined,
    },
  }),
}

const fallbackNames: Record<string, string> = {
  webhook: 'Webhook trigger',
  whatsapp: 'WhatsApp trigger',
  scheduled: 'Scheduled task',
}

function buildApiPayload(trigger: PlanTrigger) {
  const config: any = {
    task: trigger.taskDescription || 'Execute agent task',
    ...configBuilders[trigger.type]?.(trigger),
  }

  const triggerName =
    trigger.taskTitle?.trim() || fallbackNames[trigger.type] || 'Scheduled task'

  return {
    type: trigger.type,
    name: triggerName,
    config,
    enabled: trigger._enabled ?? true,
  }
}

function formatScheduleLabel(
  repeatType: TriggerConfig['repeatType'],
  time: string,
  selectedDays: number[],
  monthDay: string,
  onceDateTime: string,
  timezone?: string,
): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const tzAbbr = timezone ? getTimezoneAbbreviation(timezone) : ''
  const tzSuffix = tzAbbr ? ` (${tzAbbr})` : ''

  switch (repeatType) {
    case 'every-30min':
      return `Every 30 minutes${tzSuffix}`
    case 'every-hour':
      return `Every hour${tzSuffix}`
    case 'daily':
      return `Every day at ${time}${tzSuffix}`
    case 'weekdays':
      return `Weekdays at ${time}${tzSuffix}`
    case 'specific-days': {
      const names = selectedDays.sort().map((d) => dayNames[d])
      return `${names.join(', ')} at ${time}${tzSuffix}`
    }
    case 'monthly':
      return `Monthly on the ${monthDay === 'L' ? 'last day' : monthDay} at ${time}${tzSuffix}`
    case 'once':
      return `Once at ${onceDateTime || 'scheduled time'}${tzSuffix}`
    default:
      return 'Scheduled task'
  }
}

// ── Inline Trigger Editor ───────────────────────────────────

function InlineTriggerEditor({
  trigger,
  onChange,
  onSave,
  onRemove,
  onBack,
  isDark,
  showRemove,
  saving,
  workspaceId,
  agentId,
}: {
  trigger: PlanTrigger
  onChange: (t: PlanTrigger) => void
  onSave: () => void
  onRemove: () => void
  onBack: () => void
  isDark: boolean
  showRemove: boolean
  saving: boolean
  workspaceId?: string
  agentId?: string
}) {
  const { isCopied, copyToClipboard } = useCopyToClipboard()

  const showTimePicker =
    trigger.repeatType !== 'every-30min' &&
    trigger.repeatType !== 'every-hour' &&
    trigger.repeatType !== 'once'

  const toggleDay = (day: number) => {
    const days = trigger.selectedDays.includes(day)
      ? trigger.selectedDays.filter((d) => d !== day)
      : [...trigger.selectedDays, day]
    onChange({ ...trigger, selectedDays: days })
  }

  return (
    <m.div
      initial='hidden'
      animate='visible'
      exit='exit'
      variants={staggerParent}
      className='space-y-5'>
      {/* Back to list */}
      <m.div variants={fadeBlurChild}>
        <button
          type='button'
          onClick={onBack}
          className={cn(
            'flex items-center gap-1 text-[14px] font-semibold transition-colors',
            isDark
              ? 'text-white/50 hover:text-white/70'
              : 'text-black/50 hover:text-black/70',
          )}>
          <RiArrowLeftSLine size={18} />
          All tasks
        </button>
      </m.div>

      {/* Task title */}
      <m.div variants={fadeBlurChild}>
        <input
          type='text'
          value={trigger.taskTitle}
          onChange={(e) => onChange({ ...trigger, taskTitle: e.target.value })}
          placeholder='Task title — e.g. Morning brief, Weekly report'
          className={cn(
            'w-full bg-transparent text-[15px] font-semibold leading-relaxed',
            'focus:outline-none',
            isDark
              ? 'text-white placeholder:text-white/25'
              : 'text-[#1a1a1a] placeholder:text-black/25',
          )}
        />
      </m.div>

      {/* Task description — Lexical markdown editor */}
      <m.div
        variants={fadeBlurChild}
        className='min-h-[180px] rounded-lg [&_.lexical-content-editable]:!p-0'>
        <LexicalEditor
          content={trigger.taskDescription}
          editable={true}
          editorKey={`plan-task-${trigger._apiId || 'new'}`}
          placeholder='Describe what the agent should do — e.g. Every morning, compile overnight metrics and email a summary to team@company.com'
          onChange={(content) =>
            onChange({ ...trigger, taskDescription: content })
          }
          plugins={[<EditorModePlugin key='editor-mode' mode='markdown' />]}
        />
      </m.div>

      {/* Separator */}
      <m.div variants={fadeBlurChild}>
        <div
          className={cn('h-px', isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]')}
        />
      </m.div>

      {/* Trigger type + config */}
      <m.div variants={fadeBlurChild} className='space-y-3'>
        <SegmentedControl
          options={TRIGGER_TYPES}
          value={trigger.type}
          onChange={(v) => onChange({ ...trigger, type: v })}
          isDark={isDark}
        />

        {/* Schedule config */}
        {trigger.type === 'scheduled' && (
          <div>
            {/* Repeat option pills */}
            <div className='flex flex-wrap gap-1'>
              {REPEAT_OPTIONS.map((option, i) => (
                <m.button
                  key={option.id}
                  type='button'
                  initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  transition={{
                    delay: i * 0.045,
                    type: 'spring',
                    stiffness: 420,
                    damping: 28,
                    mass: 0.8,
                  }}
                  onClick={() =>
                    onChange({ ...trigger, repeatType: option.id })
                  }
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                    trigger.repeatType === option.id
                      ? 'bg-[#0098FC] text-white'
                      : isDark
                        ? 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white/70'
                        : 'bg-black/[0.04] text-black/40 hover:bg-black/[0.07] hover:text-black/60',
                  )}>
                  {option.label}
                </m.button>
              ))}
            </div>

            {/* Sub-picker area */}
            <div className='mt-3 min-h-[32px]'>
              {trigger.repeatType === 'specific-days' && (
                <div className='flex items-center gap-1.5'>
                  {DAYS.map((day, i) => (
                    <m.button
                      key={`${day.value}-${i}`}
                      type='button'
                      initial={{ opacity: 0, scale: 0.88, filter: 'blur(5px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      transition={{
                        delay: i * 0.04,
                        type: 'spring',
                        stiffness: 440,
                        damping: 26,
                        mass: 0.7,
                      }}
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                        trigger.selectedDays.includes(day.value)
                          ? 'bg-[#0098FC] text-white'
                          : isDark
                            ? 'bg-white/[0.06] text-white/40 hover:bg-white/[0.1]'
                            : 'bg-black/[0.04] text-black/35 hover:bg-black/[0.07]',
                      )}>
                      {day.label}
                    </m.button>
                  ))}
                </div>
              )}

              {trigger.repeatType === 'monthly' && (
                <div className='flex flex-wrap gap-1'>
                  {MONTH_DAYS.map((option, i) => (
                    <m.button
                      key={option.value}
                      type='button'
                      initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      transition={{
                        delay: i * 0.045,
                        type: 'spring',
                        stiffness: 420,
                        damping: 28,
                        mass: 0.8,
                      }}
                      onClick={() =>
                        onChange({ ...trigger, monthDay: option.value })
                      }
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                        trigger.monthDay === option.value
                          ? 'bg-[#0098FC] text-white'
                          : isDark
                            ? 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'
                            : 'bg-black/[0.04] text-black/40 hover:bg-black/[0.07]',
                      )}>
                      {option.label}
                    </m.button>
                  ))}
                </div>
              )}

              {trigger.repeatType === 'once' && (
                <m.div
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                    mass: 0.8,
                  }}>
                  <input
                    type='datetime-local'
                    value={trigger.onceDateTime}
                    onChange={(e) =>
                      onChange({ ...trigger, onceDateTime: e.target.value })
                    }
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-[13px] font-medium tabular-nums',
                      'focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                      isDark
                        ? 'border-white/[0.08] bg-white/[0.03] text-white'
                        : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a]',
                    )}
                  />
                </m.div>
              )}
            </div>

            {/* Time picker + timezone */}
            <div className='mt-3 min-h-[32px]'>
              {showTimePicker && (
                <m.div
                  className='flex items-center gap-2'
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 30,
                    mass: 0.8,
                  }}>
                  <span
                    className={cn(
                      'text-[12px]',
                      isDark ? 'text-white/30' : 'text-black/30',
                    )}>
                    at
                  </span>
                  <input
                    type='time'
                    value={trigger.scheduleTime}
                    onChange={(e) =>
                      onChange({
                        ...trigger,
                        scheduleTime: e.target.value,
                      })
                    }
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-[13px] font-medium tabular-nums',
                      'focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                      isDark
                        ? 'border-white/[0.08] bg-white/[0.03] text-white'
                        : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a]',
                    )}
                  />
                  <TimezoneSelector
                    value={trigger.timezone}
                    onChange={(tz) => onChange({ ...trigger, timezone: tz })}
                    isDark={isDark}
                  />
                </m.div>
              )}
              {trigger.repeatType === 'once' && (
                <div className='mt-2'>
                  <TimezoneSelector
                    value={trigger.timezone}
                    onChange={(tz) => onChange({ ...trigger, timezone: tz })}
                    isDark={isDark}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Webhook config */}
        {trigger.type === 'webhook' && (
          <m.div
            className='space-y-2'
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 30,
              mass: 0.8,
            }}>
            <input
              type='text'
              value={trigger.webhookSecret}
              onChange={(e) =>
                onChange({ ...trigger, webhookSecret: e.target.value })
              }
              placeholder='Secret key (optional)'
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-[13px] font-medium',
                'placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                isDark
                  ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25'
                  : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/25',
              )}
            />
            {trigger.webhookSecret && (
              <input
                type='text'
                value={trigger.webhookSignatureHeader}
                onChange={(e) =>
                  onChange({
                    ...trigger,
                    webhookSignatureHeader: e.target.value,
                  })
                }
                placeholder='Signature header (default: x-webhook-signature)'
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-[13px] font-medium',
                  'placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                  isDark
                    ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25'
                    : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/25',
                )}
              />
            )}
            {trigger._apiId && workspaceId && agentId && (
              <div
                className={cn(
                  'rounded-lg px-3 py-2',
                  isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]',
                )}>
                <p
                  className={cn(
                    'mb-1 text-[11px]',
                    isDark ? 'text-white/40' : 'text-black/35',
                  )}>
                  Webhook URL:
                </p>
                <button
                  type='button'
                  onClick={() =>
                    copyToClipboard(
                      buildAgentTriggerWebhookUrl(
                        workspaceId,
                        agentId,
                        trigger._apiId ?? '',
                      ),
                    )
                  }
                  className={cn(
                    'block w-full cursor-pointer break-all rounded px-1.5 py-1 text-left font-mono text-[10px] transition-colors',
                    isDark
                      ? 'bg-white/[0.06] text-white/60 hover:bg-white/[0.1]'
                      : 'bg-black/[0.04] text-black/50 hover:bg-black/[0.07]',
                  )}>
                  {buildAgentTriggerWebhookUrl(
                    workspaceId,
                    agentId,
                    trigger._apiId ?? '',
                  )}
                  <span className='ml-1 text-[9px] opacity-50'>
                    {isCopied ? '(copied!)' : '(click to copy)'}
                  </span>
                </button>
                {trigger.webhookSecret && (
                  <p
                    className={cn(
                      'mt-1 text-[10px]',
                      isDark ? 'text-white/30' : 'text-black/25',
                    )}>
                    Sign requests with header:{' '}
                    <code className='font-mono'>
                      x-webhook-signature: sha256=&lt;hmac&gt;
                    </code>
                  </p>
                )}
              </div>
            )}
          </m.div>
        )}

        {/* WhatsApp config */}
        {trigger.type === 'whatsapp' && (
          <div className='space-y-3'>
            <m.div
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 30,
                mass: 0.8,
              }}>
              <input
                type='text'
                value={trigger.whatsappFromNumbers}
                onChange={(e) =>
                  onChange({
                    ...trigger,
                    whatsappFromNumbers: e.target.value,
                  })
                }
                placeholder='From numbers (optional) — e.g. +1234, +5678'
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-[13px] font-medium',
                  'placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                  isDark
                    ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25'
                    : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/25',
                )}
              />
            </m.div>
            <m.div
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{
                delay: 0.05,
                type: 'spring',
                stiffness: 380,
                damping: 30,
                mass: 0.8,
              }}>
              <input
                type='text'
                value={trigger.whatsappKeywords}
                onChange={(e) =>
                  onChange({
                    ...trigger,
                    whatsappKeywords: e.target.value,
                  })
                }
                placeholder='Keywords (optional) — e.g. help, support'
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-[13px] font-medium',
                  'placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0098FC]/30',
                  isDark
                    ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25'
                    : 'border-black/[0.06] bg-black/[0.015] text-[#1a1a1a] placeholder:text-black/25',
                )}
              />
            </m.div>
            <div className='flex flex-wrap gap-1'>
              {['text', 'image', 'document', 'audio', 'video'].map(
                (type, i) => (
                  <m.button
                    key={type}
                    type='button'
                    initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{
                      delay: 0.1 + i * 0.045,
                      type: 'spring',
                      stiffness: 420,
                      damping: 28,
                      mass: 0.8,
                    }}
                    onClick={() => {
                      const types = trigger.whatsappMessageTypes.includes(type)
                        ? trigger.whatsappMessageTypes.filter((t) => t !== type)
                        : [...trigger.whatsappMessageTypes, type]
                      onChange({ ...trigger, whatsappMessageTypes: types })
                    }}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors',
                      trigger.whatsappMessageTypes.includes(type)
                        ? 'bg-[#0098FC] text-white'
                        : isDark
                          ? 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'
                          : 'bg-black/[0.04] text-black/40 hover:bg-black/[0.07]',
                    )}>
                    {type}
                  </m.button>
                ),
              )}
            </div>
          </div>
        )}
      </m.div>

      {/* Footer actions */}
      <m.div
        variants={fadeBlurChild}
        className='flex items-center justify-end gap-3 pt-2'>
        {showRemove && (
          <button
            type='button'
            onClick={onRemove}
            className={cn(
              'text-[14px] font-semibold transition-colors',
              isDark
                ? 'text-white/40 hover:text-red-400'
                : 'text-black/40 hover:text-red-500',
            )}>
            Remove
          </button>
        )}
        <button
          type='button'
          onClick={onSave}
          disabled={saving}
          className={cn(
            'rounded-full bg-[#0098FC] px-5 py-1.5 text-[14px] font-semibold text-white transition-all hover:bg-[#0088e0]',
            saving && 'opacity-50',
          )}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </m.div>
    </m.div>
  )
}

// ── Option items builder ────────────────────────────────────

function buildOptionItems(
  triggers: PlanTrigger[],
  isDark: boolean,
  isAgentExecuting: boolean,
  onRun: (index: number, e: React.MouseEvent) => void,
  onStop: (e: React.MouseEvent) => void,
  stopping: boolean,
): OptionItem<number>[] {
  return triggers.map((trigger, index) => {
    const scheduleLabel =
      trigger.type === 'webhook'
        ? 'App Signal'
        : trigger.type === 'whatsapp'
          ? 'WhatsApp'
          : formatScheduleLabel(
              trigger.repeatType,
              trigger.scheduleTime,
              trigger.selectedDays,
              trigger.monthDay,
              trigger.onceDateTime,
              trigger.timezone,
            )

    return {
      id: index,
      icon: TRIGGER_ICON_MAP[trigger.type],
      label: trigger.taskTitle || trigger.taskDescription || 'Untitled task',
      description: scheduleLabel,
      rightContent: (
        <div className='flex items-center gap-1'>
          {trigger._apiId && isAgentExecuting ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStop(e)
              }}
              disabled={stopping}
              className={cn(
                'rounded-full p-1.5 opacity-0 transition-all group-hover:opacity-100',
                stopping
                  ? 'cursor-not-allowed opacity-50'
                  : isDark
                    ? 'text-red-400/60 hover:text-red-400'
                    : 'text-red-500/50 hover:text-red-500',
              )}
              title={stopping ? 'Stopping...' : 'Stop execution'}>
              {stopping ? (
                <Spinner size='sm' />
              ) : (
                <RiStopFill className='h-5 w-5' />
              )}
            </button>
          ) : trigger._apiId ? (
            <button
              onClick={(e) => onRun(index, e)}
              className={cn(
                'rounded-full p-1.5 opacity-0 transition-all group-hover:opacity-100',
                isDark
                  ? 'text-[#0098FC]/60 hover:text-[#0098FC]'
                  : 'text-[#0098FC]/50 hover:text-[#0098FC]',
              )}
              title='Run now'>
              <RiPlayLine className='h-5 w-5' />
            </button>
          ) : null}
          <span
            className={cn(
              'text-[12px] font-medium opacity-0 transition-opacity group-hover:opacity-100',
              isDark ? 'text-white/30' : 'text-black/30',
            )}>
            Edit
          </span>
        </div>
      ),
    }
  })
}

// ── Main Component ──────────────────────────────────────────

interface AgentDetailPlanProps {
  agentId: string
}

export function AgentDetailPlan({ agentId }: AgentDetailPlanProps) {
  const { isDark } = useTheme()
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id
  const { emit } = useAppEvents<AgentEvents>()

  const { tasks } = useAgentStatus(workspaceId)
  const activeTask = tasks.find(
    (t) => t.agentId === agentId && t.status === 'executing',
  )
  const isAgentExecuting = !!activeTask
  const [stopExecution, { loading: stopping }] = useStopExecution(
    activeTask?.id || '',
  )

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingTriggerId, setPendingTriggerId] = useState('')

  const {
    data: triggersData,
    loading,
    mutate: mutateTriggers,
  } = useGetTriggers(workspaceId ?? '', agentId)
  const [createTriggerMutation] = useCreateTrigger(workspaceId ?? '', agentId)
  const [updateTriggerMutation] = useUpdateTrigger(
    workspaceId ?? '',
    agentId,
    pendingTriggerId,
  )
  const [deleteTriggerMutation] = useDeleteTrigger(
    workspaceId ?? '',
    agentId,
    pendingTriggerId,
  )
  const [runTriggerMutation] = useRunTrigger(
    workspaceId ?? '',
    agentId,
    pendingTriggerId,
  )

  const [triggers, setTriggers] = useState<PlanTrigger[]>([])

  // Refs to the latest mutation functions so handlers can call them with the
  // most recent path closure after we flushSync the pendingTriggerId state.
  const deleteMutationRef = useRef(deleteTriggerMutation)
  deleteMutationRef.current = deleteTriggerMutation
  const updateMutationRef = useRef(updateTriggerMutation)
  updateMutationRef.current = updateTriggerMutation
  const runMutationRef = useRef(runTriggerMutation)
  runMutationRef.current = runTriggerMutation

  useEffect(() => {
    if (!triggersData) return
    const converted = (triggersData.triggers || []).map((t) =>
      apiTriggerToConfig(t as any),
    )
    setTriggers(converted)
  }, [triggersData])

  // Save trigger (create or update)
  const handleSaveTrigger = async (index: number) => {
    const trigger = triggers[index]
    if (!workspaceId) return

    setSaving(true)
    try {
      const payload = buildApiPayload(trigger)

      if (trigger._apiId) {
        flushSync(() => setPendingTriggerId(trigger._apiId))
        await updateMutationRef.current(payload)
      } else {
        const result = await createTriggerMutation(payload)
        const triggerId = (result as any)?.trigger?.id || (result as any)?.id
        if (triggerId) {
          const newTriggers = [...triggers]
          newTriggers[index] = { ...trigger, _apiId: triggerId }
          setTriggers(newTriggers)
          if (trigger.type === 'webhook') {
            emit('webhookCreated', {
              webhookUrl: buildAgentTriggerWebhookUrl(
                workspaceId,
                agentId,
                triggerId,
              ),
            })
          }
        }
      }

      await mutateTriggers()
      setEditingIndex(null)
    } catch (error) {
      console.error('Failed to save trigger:', error)
    } finally {
      setSaving(false)
    }
  }

  // Delete trigger
  const handleDeleteTrigger = async (index: number) => {
    const trigger = triggers[index]
    if (!workspaceId) return

    if (trigger._apiId) {
      try {
        flushSync(() => setPendingTriggerId(trigger._apiId))
        await deleteMutationRef.current({})
      } catch (error: unknown) {
        // 404 means the trigger was already deleted on the server (stale UI state).
        // Treat as success so the row clears from the list.
        const status =
          (error as { response?: { status?: number }; status?: number })
            ?.response?.status ?? (error as { status?: number })?.status
        if (status !== 404) {
          console.error('Failed to delete trigger:', error)
          return
        }
      }
    }

    setTriggers((prev) => prev.filter((_, i) => i !== index))
    setEditingIndex(null)
    await mutateTriggers()
  }

  // Run trigger
  const handleRunTrigger = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const trigger = triggers[index]
    if (!workspaceId || !trigger._apiId || isAgentExecuting) return

    flushSync(() => setPendingTriggerId(trigger._apiId))
    runMutationRef
      .current({})
      .catch((error) => console.error('Failed to run trigger:', error))
  }

  // Add new trigger
  const addTrigger = () => {
    const newTriggers = [...triggers, { ...createEmptyTrigger() }]
    setTriggers(newTriggers)
    setEditingIndex(newTriggers.length - 1)
  }

  // Update trigger locally
  const updateTrigger = (index: number, trigger: PlanTrigger) => {
    const newTriggers = [...triggers]
    newTriggers[index] = trigger
    setTriggers(newTriggers)
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-16'>
        <Spinner size='md' />
      </div>
    )
  }

  const isEditing = editingIndex !== null && triggers[editingIndex]
  const optionItems = buildOptionItems(
    triggers,
    isDark,
    isAgentExecuting,
    handleRunTrigger,
    (e) => {
      e.stopPropagation()
      stopExecution()
    },
    stopping,
  )

  return (
    <div className='pt-8'>
      {isEditing ? (
        <InlineTriggerEditor
          key={`editor-${editingIndex}`}
          trigger={triggers[editingIndex]}
          onChange={(t) => updateTrigger(editingIndex, t)}
          onSave={() => handleSaveTrigger(editingIndex)}
          onRemove={() => handleDeleteTrigger(editingIndex)}
          onBack={() => setEditingIndex(null)}
          isDark={isDark}
          showRemove={true}
          saving={saving}
          workspaceId={workspaceId}
          agentId={agentId}
        />
      ) : (
        <div className='space-y-5'>
          {triggers.length > 0 && (
            <OptionList
              options={optionItems}
              onOptionClick={(index) => setEditingIndex(index)}
              isDark={isDark}
              showDescriptions
              animated
            />
          )}

          <m.div
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{
              delay: triggers.length > 0 ? 0.5 : 0.1,
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}>
            <button
              type='button'
              onClick={addTrigger}
              className={cn(
                'flex items-center gap-1.5 text-[14px] font-semibold transition-colors',
                isDark
                  ? 'text-white/50 hover:text-white/70'
                  : 'text-black/50 hover:text-black/70',
              )}>
              <RiAddLine size={16} />
              Add task
            </button>
          </m.div>
        </div>
      )}
    </div>
  )
}
