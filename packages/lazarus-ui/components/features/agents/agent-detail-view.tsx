'use client'

import * as m from 'motion/react-m'
import { memo, useEffect, useState } from 'react'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LazarusLoader } from '@/components/ui/lazarus-loader'
import { TabPanel, Tabs } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/auth/use-auth'
import { useAppEvents } from '@/hooks/core/use-app-events'
import { useTabs } from '@/hooks/core/use-tabs'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useDeleteAgent } from '@/hooks/features/agents/use-delete-agent'
import { useGetAgent } from '@/hooks/features/agents/use-get-agent'
import { useMCPTools } from '@/hooks/features/agents/use-mcp-tools'
import { useUpdateAgent } from '@/hooks/features/agents/use-update-agent'
import { useWhatsAppConfig } from '@/hooks/features/agents/use-whatsapp-config'
import { useWorkspaceMCPs } from '@/hooks/features/mcp/use-workspace-mcps'
import { useTheme } from '@/hooks/ui/use-theme'
import { useWorkspaceConfig } from '@/hooks/workspace/use-workspace-config'
import { cn } from '@/lib/utils'
import { ClaudeCodeAgent } from '@/model/claude-code-agent'

import { AgentDetailGuardrails } from './agent-detail/agent-detail-guardrails'
import { AgentDetailHeader } from './agent-detail/agent-detail-header'
import { AgentDetailMemory } from './agent-detail/agent-detail-memory'
import { AgentDetailOverview } from './agent-detail/agent-detail-overview'
import { AgentDetailPlan } from './agent-detail/agent-detail-schedule'
import type { GuardrailConfig } from './guardrails/guardrail-types'

const AVAILABLE_TOOLS = [
  'filesystem',
  'read',
  'write',
  'edit',
  'grep',
  'glob',
  'bash',
  'mcp',
  'web_search',
  'web_fetch',
]

const DETAIL_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'plan', label: 'Plan' },
  { id: 'guardrails', label: 'Guardrails' },
  { id: 'memory', label: 'Memory' },
]

interface AgentDetailsProps {
  agent: ClaudeCodeAgent
  onUpdate: () => void
}

export function AgentDetails({
  agent: initialAgent,
  onUpdate,
}: AgentDetailsProps) {
  const { isDark } = useTheme()
  const { session } = useAuth()
  const { selectedWorkspace, isInitialized: workspacesInitialized } =
    useWorkspace()
  const { closeTab, getTabForFile, openFileTab } = useTabs()
  const { emit } = useAppEvents()
  const userId = session?.user?.id
  const workspaceId = initialAgent?.workspaceId || selectedWorkspace?.id

  const [updateAgent] = useUpdateAgent(workspaceId ?? '', initialAgent.id)
  const [deleteAgent] = useDeleteAgent(workspaceId ?? '', initialAgent.id)

  const [isEditMode, setIsEditMode] = useState(false)
  const [editedAgent, setEditedAgent] = useState<ClaudeCodeAgent>(initialAgent)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { allMCPs: availableMCPs, loading: loadingMCPs } =
    useWorkspaceMCPs(workspaceId)
  const { phoneNumber: whatsappPhone, phoneStatus: whatsappPhoneStatus } =
    useWhatsAppConfig(workspaceId ?? '', initialAgent?.id ?? '')
  const [guardrails, setGuardrails] = useState<GuardrailConfig[]>(
    initialAgent.guardrails || [],
  )
  const {
    mcpServers: mcpToolServers,
    loading: mcpToolsLoading,
    refresh: refreshMCPTools,
  } = useMCPTools(workspaceId, initialAgent?.id)

  const { config: workspaceConfig } = useWorkspaceConfig(workspaceId ?? '')

  const emailDomain = process.env.NEXT_PUBLIC_EMAIL_DOMAIN || 'mail.example.com'
  const agentEmail =
    (initialAgent as any)?.email?.address ||
    (workspaceConfig?.slug
      ? `${initialAgent?.id}@${workspaceConfig.slug}.${emailDomain}`
      : `${initialAgent?.id}@${emailDomain}`)

  useEffect(() => {
    setEditedAgent(initialAgent)
    setGuardrails(initialAgent.guardrails || [])
  }, [initialAgent])

  // ── Handlers ──────────────────────────────────────────

  const handleStartEdit = () => {
    if (initialAgent?.metadata?.isSystemAgent) return
    setIsEditMode(true)
    setEditedAgent({ ...initialAgent! })
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setEditedAgent({ ...initialAgent! })
    setGuardrails(initialAgent.guardrails || [])
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!editedAgent || !workspaceId) {
      setSaveError('Missing workspace or agent data')
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await updateAgent({
        name: editedAgent.name,
        description: editedAgent.description,
        systemPrompt: editedAgent.systemPrompt,
        allowedTools: editedAgent.allowedTools,
        customTools: editedAgent.customTools,
        modelConfig: editedAgent.modelConfig,
        mcpServers: editedAgent.mcpServers,
        activeMCPs: editedAgent.activeMCPs,
        triggers: editedAgent.triggers,
        guardrails,
        metadata: editedAgent.metadata,
      })
      setIsEditMode(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      onUpdate()
    } catch (error) {
      console.error('[AgentDetails] Failed to save agent:', error)
      setSaveError(
        error instanceof Error ? error.message : 'Failed to save agent',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setEditedAgent((prev) => {
      if (!prev) return prev
      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        return {
          ...prev,
          [parent]: {
            ...(prev as any)[parent],
            [child]: value,
          },
        }
      }
      return { ...prev, [field]: value }
    })
  }

  const toggleTool = (tool: string) => {
    setEditedAgent((prev) => {
      if (!prev) return prev
      const tools = prev.allowedTools?.includes('*')
        ? AVAILABLE_TOOLS
        : prev.allowedTools || []
      return {
        ...prev,
        allowedTools: tools.includes(tool)
          ? tools.filter((t) => t !== tool)
          : [...tools, tool],
      }
    })
  }

  const toggleMCP = (mcp: string) => {
    setEditedAgent((prev) => {
      if (!prev) return prev
      const mcps =
        prev.activeMCPs ??
        availableMCPs.filter((m) => m.enabled !== false).map((m) => m.name)
      return {
        ...prev,
        activeMCPs: mcps.includes(mcp)
          ? mcps.filter((m) => m !== mcp)
          : [...mcps, mcp],
      }
    })
  }

  const addTag = () => {
    if (!newTag || !editedAgent) return
    if (editedAgent.tags?.includes(newTag)) return
    setEditedAgent((prev) => ({
      ...prev!,
      tags: [...(prev!.tags || []), newTag],
    }))
    setNewTag('')
  }

  const removeTag = (tag: string) => {
    setEditedAgent((prev) => {
      if (!prev) return prev
      return { ...prev, tags: prev.tags?.filter((t) => t !== tag) || [] }
    })
  }

  const handleDelete = async () => {
    if (!initialAgent?.id || !workspaceId || !userId) return

    setIsDeleting(true)
    setSaveError(null)

    try {
      await deleteAgent({})
      emit('agentDeleted', { agentId: initialAgent.id })

      const fileId = `${workspaceId}/agent/${initialAgent.id}`
      const tab = getTabForFile(fileId)
      if (tab) closeTab(tab.id)
      await openFileTab(`${workspaceId}/agents`, {
        name: 'Agents',
        fileType: 'agents_collection',
        scope: 'user',
        scopeId: workspaceId,
      })
    } catch (error) {
      console.error('Failed to delete agent:', error)
      setSaveError(
        error instanceof Error ? error.message : 'Failed to delete agent',
      )
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Render ────────────────────────────────────────────

  return (
    <m.div
      className='h-full overflow-y-auto px-6 py-6'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}>
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        {/* Header */}
        <div className='mb-6'>
          <AgentDetailHeader
            agent={initialAgent}
            editedAgent={editedAgent}
            agentEmail={agentEmail}
            whatsappPhone={whatsappPhone}
            whatsappPhoneStatus={whatsappPhoneStatus}
            isEditMode={isEditMode}
            isSaving={isSaving}
            isDark={isDark}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSave={handleSave}
            onDelete={() => setShowDeleteConfirm(true)}
            onUpdateField={updateField}
          />

          {/* Feedback messages */}
          {saveError && (
            <m.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'mt-4 rounded-md border px-4 py-3 text-[13px]',
                isDark
                  ? 'border-red-500/20 bg-red-500/10 text-red-400'
                  : 'border-red-500/20 bg-red-50 text-red-600',
              )}>
              {saveError}
            </m.div>
          )}
          {saveSuccess && (
            <m.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'mt-4 rounded-md border px-4 py-3 text-[13px]',
                isDark
                  ? 'border-green-500/20 bg-green-500/10 text-green-400'
                  : 'border-green-500/20 bg-green-50 text-green-600',
              )}>
              Agent saved successfully
            </m.div>
          )}
        </div>

        {/* Tabs */}
        <Tabs
          tabs={DETAIL_TABS}
          defaultValue='overview'
          variant='pill'
          size='small'
          fontSize={14}
          isDark={isDark}>
          <TabPanel value='overview'>
            <AgentDetailOverview
              agent={initialAgent}
              editedAgent={editedAgent}
              isEditMode={isEditMode}
              isDark={isDark}
              availableMCPs={availableMCPs}
              loadingMCPs={loadingMCPs}
              workspacesInitialized={workspacesInitialized}
              workspaceId={workspaceId}
              newTag={newTag}
              onNewTagChange={setNewTag}
              onAddTag={addTag}
              onRemoveTag={removeTag}
              onUpdateField={updateField}
              onToggleTool={toggleTool}
              onToggleMCP={toggleMCP}
            />
          </TabPanel>

          <TabPanel value='plan'>
            <AgentDetailPlan agentId={initialAgent.id} />
          </TabPanel>

          <TabPanel value='guardrails'>
            <AgentDetailGuardrails
              guardrails={guardrails}
              isDark={isDark}
              isEditMode={isEditMode}
              onGuardrailsChange={setGuardrails}
              mcpServers={mcpToolServers}
              mcpLoading={mcpToolsLoading}
              onMCPRefresh={refreshMCPTools}
            />
          </TabPanel>

          <TabPanel value='memory'>
            {workspaceId ? (
              <AgentDetailMemory
                workspaceId={workspaceId}
                agentId={initialAgent.id}
                agentName={initialAgent.name}
              />
            ) : (
              <div className='p-6 text-sm opacity-60'>
                Select a workspace to view agent memory.
              </div>
            )}
          </TabPanel>
        </Tabs>
      </m.div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          isDark={isDark}
          title='Delete agent'
          message={`Are you sure you want to delete "${initialAgent.name}"? All agent data, triggers, and configurations will be permanently removed.`}
          confirmText='Delete'
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          isLoading={isDeleting}
          variant='danger'
        />
      )}
    </m.div>
  )
}

// Wrapper component for backward compatibility
interface AgentDetailViewProps {
  agentId: string
  workspaceId?: string
  isDark?: boolean
}

export const AgentDetailView = memo(({ agentId }: AgentDetailViewProps) => {
  const { isDark } = useTheme()
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const {
    data,
    loading,
    mutate: refreshAgent,
  } = useGetAgent(workspaceId ?? '', agentId)
  const agent = (data as any)?.agent ?? data ?? null

  if (loading) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className='flex h-full items-center justify-center'>
        <LazarusLoader />
      </m.div>
    )
  }

  if (!agent) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className='flex h-full items-center justify-center'>
        <div className='text-sm opacity-50'>Agent not found</div>
      </m.div>
    )
  }

  return <AgentDetails agent={agent} onUpdate={refreshAgent} />
})

AgentDetailView.displayName = 'AgentDetailView'
