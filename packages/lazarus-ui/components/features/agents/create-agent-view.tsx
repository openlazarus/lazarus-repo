'use client'

import {
  RiBookReadLine,
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiEditLine,
  RiFileSearchLine,
  RiFolderLine,
  RiGitBranchLine,
  RiGlobalLine,
  RiPencilLine,
  RiPlugLine,
  RiSearchLine,
  RiServerLine,
  RiSettings3Line,
  RiTerminalLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Spinner from '@/components/ui/spinner'
import { TextArea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/auth/use-auth'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { useTheme } from '@/hooks/ui/use-theme'
import { useWorkspaceConfig } from '@/hooks/workspace/use-workspace-config'
import { api } from '@/lib/api-client'
import { getSourceLogoPath } from '@/lib/source-logos'
import { cn } from '@/lib/utils'
import { buildAgentTriggerWebhookUrl } from '@/lib/webhook-url'
import { ClaudeCodeAgent } from '@/model/claude-code-agent'

import { CreateTriggerModal } from './create-trigger-modal'
import { TriggerList } from './trigger-list'
import { WebhookUrlModal } from './webhook-url-modal'

// Get icon component for MCP based on name
const getMCPIcon = (name: string) => {
  const lowerName = name.toLowerCase()

  if (lowerName.includes('file') || lowerName.includes('filesystem')) {
    return RiFolderLine
  }
  if (lowerName.includes('git')) {
    return RiGitBranchLine
  }
  if (
    lowerName.includes('database') ||
    lowerName.includes('sqlite') ||
    lowerName.includes('postgres')
  ) {
    return RiDatabase2Line
  }
  if (
    lowerName.includes('fetch') ||
    lowerName.includes('web') ||
    lowerName.includes('http')
  ) {
    return RiGlobalLine
  }
  if (lowerName.includes('code') || lowerName.includes('github')) {
    return RiCodeSSlashLine
  }
  if (lowerName.includes('server')) {
    return RiServerLine
  }

  return RiSettings3Line
}

// Map tool names to their icons
const TOOL_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  filesystem: RiFolderLine,
  read: RiBookReadLine,
  write: RiPencilLine,
  edit: RiEditLine,
  grep: RiSearchLine,
  glob: RiFileSearchLine,
  bash: RiTerminalLine,
  mcp: RiPlugLine,
  web_search: RiGlobalLine,
  web_fetch: RiGlobalLine,
}

interface CreateAgentViewProps {
  agent?: ClaudeCodeAgent | null
  onSave: (agent: Partial<ClaudeCodeAgent>) => void
  onClose: () => void
}

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

// Utility function to slugify name into ID
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

export function CreateAgentView({
  agent,
  onSave,
  onClose,
}: CreateAgentViewProps) {
  const { isDark } = useTheme()
  const { session } = useAuth()
  const { selectedWorkspace, isInitialized: workspacesInitialized } =
    useWorkspace()
  const userId = session?.user?.id
  const workspaceId = selectedWorkspace?.id
  const [isExiting, setIsExiting] = useState(false)

  // Get workspace config for email address
  const { config: workspaceConfig } = useWorkspaceConfig(
    workspaceId || '',
    userId || '',
  )

  const [formData, setFormData] = useState<Partial<ClaudeCodeAgent>>({
    name: agent?.name || '',
    description: agent?.description || '',
    systemPrompt: agent?.systemPrompt || '',
    allowedTools: agent?.allowedTools || AVAILABLE_TOOLS, // Default all tools enabled
    modelConfig: {
      model: 'opus', // Alias for latest Opus 4.5
      temperature: 0.5, // Hardcoded
    },
    workspaceId: workspaceId || '',
    scope: 'user', // Hardcoded
    agentType: 'lazarus', // Hardcoded
  })

  const [availableMCPs, setAvailableMCPs] = useState<
    Array<{ name: string; preset_id?: string }>
  >([])
  const [loadingMCPs, setLoadingMCPs] = useState(false)
  const [showCreateTrigger, setShowCreateTrigger] = useState(false)
  const [triggerListKey, setTriggerListKey] = useState(0)
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const isSystemAgent = agent?.isSystemAgent === true

  // Auto-generate agent ID from name
  const agentId = agent?.id || slugify(formData.name || '')

  // Update workspaceId when selectedWorkspace changes
  useEffect(() => {
    if (workspaceId) {
      setFormData((prev) => ({ ...prev, workspaceId }))
    }
  }, [workspaceId])

  // Fetch available MCPs when workspace changes
  useEffect(() => {
    const fetchMCPs = async () => {
      if (!workspaceId || !userId) {
        setAvailableMCPs([])
        return
      }

      try {
        setLoadingMCPs(true)
        const baseUrl = getWorkspaceBaseUrl(workspaceId)
        const data = await api.get<{
          availableServers?: Array<{ name: string; preset_id?: string }>
        }>(`${baseUrl}/api/workspaces/mcp/sources`, {
          headers: { 'x-workspace-id': workspaceId },
        })

        const mcps =
          data.availableServers?.map((s) => ({
            name: s.name,
            preset_id: s.preset_id,
          })) || []
        setAvailableMCPs(mcps)

        // Initialize activeMCPs with all MCP names if not set
        if (!formData.activeMCPs) {
          setFormData((prev) => ({
            ...prev,
            activeMCPs: mcps.map((m) => m.name),
          }))
        }
      } catch (error) {
        console.error('Failed to load MCPs:', error)
        setAvailableMCPs([])
      } finally {
        setLoadingMCPs(false)
      }
    }
    fetchMCPs()
  }, [workspaceId, userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError(null)
    setIsSaving(true)
    try {
      await onSave({
        ...formData,
        id: agentId,
        autoTriggerEmail: true,
      })
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Failed to save agent',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleTriggerCreated = (created?: { id: string; type: string }) => {
    setTriggerListKey((prev) => prev + 1)
    if (created?.type === 'webhook' && created.id && workspaceId && agentId) {
      setWebhookUrl(
        buildAgentTriggerWebhookUrl(workspaceId, agentId, created.id),
      )
    }
  }

  const toggleTool = (tool: string) => {
    setFormData((prev) => {
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
    setFormData((prev) => {
      const mcps = prev.activeMCPs ?? availableMCPs.map((m) => m.name)
      return {
        ...prev,
        activeMCPs: mcps.includes(mcp)
          ? mcps.filter((m) => m !== mcp)
          : [...mcps, mcp],
      }
    })
  }

  return (
    <m.div
      className='h-full overflow-y-auto px-6 py-6'
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}>
      <form onSubmit={handleSubmit}>
        <m.div
          className='relative z-10'
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: isExiting ? 0 : 1,
            y: isExiting ? -20 : 0,
          }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}>
          {/* Header */}
          <div className='mb-6 flex items-center justify-between'>
            <m.div className='flex items-center gap-2'>
              {isSystemAgent && (
                <m.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.2,
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                  }}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-medium',
                    isDark
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-blue-500/10 text-blue-600',
                  )}>
                  System Agent
                </m.div>
              )}
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}>
              <h1 className='text-[18px] font-semibold tracking-[-0.02em]'>
                {agent ? 'Edit agent' : 'Create new agent'}
              </h1>
            </m.div>
          </div>

          {/* Main Content Area */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className='mx-auto max-w-3xl space-y-8 py-6'>
            {/* SECTION: Basic Info */}
            <div className='space-y-6'>
              <h2
                className={cn(
                  'border-b pb-2 text-[15px] font-semibold',
                  isDark ? 'border-white/10' : 'border-black/10',
                )}>
                Basic Information
              </h2>

              <div>
                <Input
                  label='Name'
                  type='text'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='e.g., My Custom Agent'
                  required
                  disabled={isSystemAgent}
                  variant='ghost'
                  size='small'
                  isDark={isDark}
                />
              </div>

              <div>
                <Input
                  label='Agent ID'
                  type='text'
                  value={agentId || '(auto-generated from name)'}
                  disabled
                  variant='ghost'
                  size='small'
                  isDark={isDark}
                  helperText='Automatically generated from agent name'
                  className='font-mono text-[12px]'
                />
              </div>

              <div>
                <TextArea
                  label='Description'
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder='Describe what this agent does...'
                  rows={4}
                  disabled={isSystemAgent}
                  variant='ghost'
                  size='small'
                  isDark={isDark}
                  resizable={false}
                />
              </div>

              <div>
                <Input
                  label='Agent email'
                  type='text'
                  value={(() => {
                    const emailDomain =
                      process.env.NEXT_PUBLIC_EMAIL_DOMAIN || 'mail.example.com'
                    if (workspaceConfig?.slug && agentId) {
                      return `${agentId}@${workspaceConfig.slug}.${emailDomain}`
                    }
                    return agentId
                      ? `${agentId}@${emailDomain}`
                      : `@${emailDomain}`
                  })()}
                  disabled
                  variant='ghost'
                  size='small'
                  isDark={isDark}
                  helperText='Email interactions are restricted to workspace members'
                />
              </div>
            </div>

            {/* SECTION: Personality & Instructions */}
            <div className='space-y-6'>
              <h2
                className={cn(
                  'border-b pb-2 text-[15px] font-semibold',
                  isDark ? 'border-white/10' : 'border-black/10',
                )}>
                Instructions
              </h2>

              <div>
                <TextArea
                  label='How should your agent behave?'
                  value={formData.systemPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, systemPrompt: e.target.value })
                  }
                  placeholder="Describe your agent's personality and what it should do. For example: 'You are a friendly assistant that helps with customer support. Always be polite and helpful. If you don't know the answer, say so honestly.'"
                  rows={20}
                  required
                  disabled={isSystemAgent}
                  variant='ghost'
                  size='small'
                  isDark={isDark}
                  resizable={false}
                  helperText='Write instructions as if you were explaining to a new team member how to behave and what their job is.'
                  className='font-mono text-[12px]'
                />
              </div>
            </div>

            {/* SECTION: Capabilities */}
            <div className='space-y-6'>
              <h2
                className={cn(
                  'border-b pb-2 text-[15px] font-semibold',
                  isDark ? 'border-white/10' : 'border-black/10',
                )}>
                Capabilities
              </h2>

              <div>
                <div className='flex flex-wrap gap-2'>
                  {AVAILABLE_TOOLS.map((tool) => {
                    const ToolIcon = TOOL_ICONS[tool] || RiSettings3Line
                    const isActive =
                      formData.allowedTools?.includes('*') ||
                      formData.allowedTools?.includes(tool)

                    return (
                      <button
                        key={tool}
                        type='button'
                        onClick={() => toggleTool(tool)}
                        disabled={isSystemAgent}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] transition-all',
                          isActive
                            ? 'bg-[#0098FC] text-white'
                            : isDark
                              ? 'bg-white/10 text-white/70 hover:bg-white/15'
                              : 'bg-black/10 text-black/70 hover:bg-black/15',
                          isSystemAgent && 'cursor-not-allowed opacity-50',
                        )}>
                        <ToolIcon size={14} />
                        {tool}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* SECTION: Sources */}
            <div className='space-y-6'>
              <h2
                className={cn(
                  'border-b pb-2 text-[15px] font-semibold',
                  isDark ? 'border-white/10' : 'border-black/10',
                )}>
                Sources
                {(formData.activeMCPs
                  ? formData.activeMCPs.length > 0
                  : availableMCPs.length > 0) && (
                  <span
                    className={cn(
                      'ml-2 text-[11px] font-normal',
                      isDark ? 'text-white/50' : 'text-black/50',
                    )}>
                    (
                    {formData.activeMCPs
                      ? formData.activeMCPs.length
                      : availableMCPs.length}
                    )
                  </span>
                )}
              </h2>

              <div>
                {!workspacesInitialized || !workspaceId ? (
                  <div className='py-2'>
                    <Spinner size='sm' />
                  </div>
                ) : loadingMCPs ? (
                  <div className='py-2'>
                    <Spinner size='sm' />
                  </div>
                ) : availableMCPs.length === 0 ? (
                  <p
                    className={cn(
                      'text-[12px] italic',
                      isDark ? 'text-white/50' : 'text-black/50',
                    )}>
                    No sources available in this workspace
                  </p>
                ) : (
                  <div className='flex flex-wrap gap-2'>
                    {availableMCPs.map((mcp) => {
                      const logoPath = getSourceLogoPath(
                        mcp.preset_id,
                        mcp.name,
                      )
                      const IconComponent = getMCPIcon(mcp.name)
                      const isActive =
                        !formData.activeMCPs ||
                        formData.activeMCPs.includes(mcp.name)

                      return (
                        <button
                          key={mcp.name}
                          type='button'
                          onClick={() => toggleMCP(mcp.name)}
                          disabled={isSystemAgent}
                          className={cn(
                            'flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] transition-all',
                            isActive
                              ? 'bg-[#0098FC] text-white'
                              : isDark
                                ? 'bg-white/10 text-white/70 hover:bg-white/15'
                                : 'bg-black/10 text-black/70 hover:bg-black/15',
                            isSystemAgent && 'cursor-not-allowed opacity-50',
                          )}>
                          {logoPath ? (
                            <Image
                              src={logoPath}
                              alt={mcp.name}
                              width={14}
                              height={14}
                              className={cn(
                                'h-3.5 w-3.5 object-contain',
                                isActive && 'brightness-0 invert',
                              )}
                            />
                          ) : (
                            <IconComponent size={14} />
                          )}
                          {mcp.name}
                        </button>
                      )
                    })}
                  </div>
                )}
                <p
                  className={cn(
                    'mt-3 text-[11px]',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}>
                  Select which sources this agent can use. If none are selected,
                  all workspace sources will be available.
                </p>
              </div>
            </div>

            {/* Scheduled Work - Only show if agent exists (not during initial creation) */}
            {agent && (
              <m.div
                className={cn(
                  'border-t py-6',
                  isDark ? 'border-white/5' : 'border-black/5',
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}>
                <m.h2
                  className='mb-4 text-[14px] font-medium'
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.55 }}>
                  Scheduled Work
                </m.h2>
                <TriggerList
                  key={triggerListKey}
                  agentId={agent.id}
                  onCreateTrigger={() => setShowCreateTrigger(true)}
                />
              </m.div>
            )}

            {/* Error Message */}
            {saveError && (
              <m.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-md border px-4 py-3 text-[13px]',
                  isDark
                    ? 'border-red-500/20 bg-red-500/10 text-red-400'
                    : 'border-red-500/20 bg-red-50 text-red-600',
                )}>
                {saveError}
              </m.div>
            )}

            {/* Action Buttons */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cn(
                'flex justify-end gap-3 border-t pt-6',
                isDark ? 'border-white/5' : 'border-black/5',
              )}>
              <Button
                type='button'
                onClick={onClose}
                variant='secondary'
                size='small'
                disabled={isSaving}>
                {isSystemAgent ? 'Close' : 'Cancel'}
              </Button>
              {!isSystemAgent && (
                <Button
                  type='submit'
                  variant='active'
                  size='small'
                  disabled={isSaving}>
                  {isSaving
                    ? 'Saving...'
                    : agent
                      ? 'Update agent'
                      : 'Create agent'}
                </Button>
              )}
            </m.div>
          </m.div>
        </m.div>
      </form>

      {/* Create Trigger Modal */}
      {showCreateTrigger && agentId && (
        <CreateTriggerModal
          agentId={agentId}
          onClose={() => setShowCreateTrigger(false)}
          onSuccess={handleTriggerCreated}
        />
      )}

      {/* Webhook URL Modal */}
      {webhookUrl && (
        <WebhookUrlModal
          webhookUrl={webhookUrl}
          onClose={() => setWebhookUrl(null)}
        />
      )}
    </m.div>
  )
}
