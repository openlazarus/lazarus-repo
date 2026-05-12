'use client'

import {
  RiAddLine,
  RiBookReadLine,
  RiCloseLine,
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
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LexicalEditor } from '@/components/ui/lexical/lexical-editor'
import { EditorModePlugin } from '@/components/ui/lexical/plugins/editor-mode-plugin'
import '@/components/ui/lexical/xcode-theme.css'
import Spinner from '@/components/ui/spinner'
import { getSourceLogoPath } from '@/lib/source-logos'
import { cn } from '@/lib/utils'
import { getToolDisplayName } from '@/lib/utils/tool-display-names'
import { ClaudeCodeAgent } from '@/model/claude-code-agent'

import { getModelLabel, type TSupportedModel } from '@/lib/agent-models'
import { EmailConfigPanel } from '../email-config'
import { ModelSelector } from '../model-selector'
import { WhatsAppConfigPanel } from '../whatsapp-config'

const getMCPIcon = (name: string) => {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('file') || lowerName.includes('filesystem'))
    return RiFolderLine
  if (lowerName.includes('git')) return RiGitBranchLine
  if (
    lowerName.includes('database') ||
    lowerName.includes('sqlite') ||
    lowerName.includes('postgres')
  )
    return RiDatabase2Line
  if (
    lowerName.includes('fetch') ||
    lowerName.includes('web') ||
    lowerName.includes('http')
  )
    return RiGlobalLine
  if (lowerName.includes('code') || lowerName.includes('github'))
    return RiCodeSSlashLine
  if (lowerName.includes('server')) return RiServerLine
  return RiSettings3Line
}

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

interface AgentDetailOverviewProps {
  agent: ClaudeCodeAgent
  editedAgent: ClaudeCodeAgent
  isEditMode: boolean
  isDark: boolean
  availableMCPs: Array<{ name: string; preset_id?: string; enabled?: boolean }>
  loadingMCPs: boolean
  workspacesInitialized: boolean
  workspaceId: string | undefined
  newTag: string
  onNewTagChange: (tag: string) => void
  onAddTag: () => void
  onRemoveTag: (tag: string) => void
  onUpdateField: (field: string, value: any) => void
  onToggleTool: (tool: string) => void
  onToggleMCP: (mcp: string) => void
}

export function AgentDetailOverview({
  agent,
  editedAgent,
  isEditMode,
  isDark,
  availableMCPs,
  loadingMCPs,
  workspacesInitialized,
  workspaceId,
  newTag,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
  onUpdateField,
  onToggleTool,
  onToggleMCP,
}: AgentDetailOverviewProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const enabledToolCount = editedAgent.allowedTools?.length || 0
  const enabledMCPNames = new Set(
    availableMCPs.filter((m) => m.enabled !== false).map((m) => m.name),
  )
  const enabledSourceCount =
    editedAgent.activeMCPs?.filter((name) => enabledMCPNames.has(name))
      .length || 0

  return (
    <div className='space-y-6 pt-8'>
      {/* Model */}
      <div>
        <h3 className='mb-3 text-[17px] font-semibold'>Model</h3>
        {isEditMode ? (
          <ModelSelector
            value={editedAgent.modelConfig?.model}
            onChange={(m: TSupportedModel) =>
              onUpdateField('modelConfig.model', m)
            }
            isDark={isDark}
            label=''
            size='medium'
          />
        ) : (
          <p
            className={cn(
              'text-sm',
              isDark ? 'text-white/70' : 'text-black/70',
            )}>
            {getModelLabel(editedAgent.modelConfig?.model || '')}
          </p>
        )}
      </div>

      {/* Instructions */}
      <div>
        <h3 className='mb-3 text-[17px] font-semibold'>Instructions</h3>
        <div
          className={cn(
            'max-h-[400px] overflow-y-auto rounded-lg',
            isEditMode && 'min-h-[200px]',
          )}>
          <LexicalEditor
            content={editedAgent.systemPrompt}
            editable={isEditMode}
            editorKey={`agent-instructions-${agent.id}-${isEditMode ? 'edit' : 'view'}`}
            placeholder='Describe what this agent should help with, how it should respond, and any rules it should follow.'
            onChange={
              isEditMode
                ? (content) => onUpdateField('systemPrompt', content)
                : undefined
            }
            plugins={[<EditorModePlugin key='editor-mode' mode='markdown' />]}
          />
        </div>
      </div>

      {/* WhatsApp channel config — edit mode only */}
      {isEditMode && (
        <div>
          <h3 className='mb-3 text-[17px] font-semibold'>WhatsApp</h3>
          <WhatsAppConfigPanel
            agentId={agent.id}
            agentName={agent.name}
            isEditMode={isEditMode}
          />
        </div>
      )}

      {/* Email config — edit mode only */}
      {isEditMode && (
        <div>
          <h3 className='mb-3 text-[17px] font-semibold'>Email</h3>
          <EmailConfigPanel agentId={agent.id} isEditMode={isEditMode} />
        </div>
      )}

      {/* Advanced settings */}
      <div>
        <button
          type='button'
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'flex w-full items-center justify-between py-2 text-[14px] font-semibold',
            isDark ? 'text-white/70' : 'text-black/70',
          )}>
          <span>Advanced settings</span>
          <m.svg
            width={14}
            height={14}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
            strokeLinecap='round'
            strokeLinejoin='round'
            animate={{ rotate: showAdvanced ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className='opacity-40'>
            <polyline points='6 9 12 15 18 9' />
          </m.svg>
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className='overflow-hidden'>
              <div className='space-y-5 pb-2 pt-2'>
                {/* Capabilities */}
                <div>
                  <p
                    className={cn(
                      'mb-2 text-[14px] font-medium',
                      isDark ? 'text-white/50' : 'text-black/50',
                    )}>
                    Capabilities
                    <span className='ml-1.5 font-normal'>
                      ({enabledToolCount})
                    </span>
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {AVAILABLE_TOOLS.map((tool) => {
                      const ToolIcon = TOOL_ICONS[tool] || RiSettings3Line
                      const isActive = editedAgent.allowedTools.includes(tool)

                      return (
                        <button
                          key={tool}
                          onClick={() => isEditMode && onToggleTool(tool)}
                          disabled={!isEditMode}
                          className={cn(
                            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-all',
                            isActive
                              ? 'bg-[#0098FC] text-white'
                              : isDark
                                ? 'bg-white/10 text-white/70 hover:bg-white/15'
                                : 'bg-black/10 text-black/70 hover:bg-black/15',
                            !isEditMode &&
                              'cursor-default hover:bg-transparent hover:text-inherit',
                          )}>
                          <ToolIcon size={14} />
                          {getToolDisplayName(tool)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Sources */}
                <div>
                  <p
                    className={cn(
                      'mb-2 text-[14px] font-medium',
                      isDark ? 'text-white/50' : 'text-black/50',
                    )}>
                    Sources
                    <span className='ml-1.5 font-normal'>
                      ({loadingMCPs ? '...' : enabledSourceCount})
                    </span>
                  </p>
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
                        'text-[13px]',
                        isDark ? 'text-white/40' : 'text-black/40',
                      )}>
                      No sources available
                    </p>
                  ) : (
                    <div className='flex flex-wrap gap-2'>
                      {availableMCPs
                        .filter((mcp) => mcp.enabled !== false)
                        .map((mcp) => {
                          const logoPath = getSourceLogoPath(
                            mcp.preset_id,
                            mcp.name,
                          )
                          const IconComponent = getMCPIcon(mcp.name)
                          const isActive = editedAgent.activeMCPs?.includes(
                            mcp.name,
                          )

                          return (
                            <button
                              key={mcp.name}
                              onClick={() =>
                                isEditMode && onToggleMCP(mcp.name)
                              }
                              disabled={!isEditMode}
                              className={cn(
                                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-all',
                                isActive
                                  ? 'bg-[#0098FC] text-white'
                                  : isDark
                                    ? 'bg-white/10 text-white/70 hover:bg-white/15'
                                    : 'bg-black/10 text-black/70 hover:bg-black/15',
                                !isEditMode &&
                                  'cursor-default hover:bg-transparent hover:text-inherit',
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
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tags */}
      {(editedAgent.tags && editedAgent.tags.length > 0) || isEditMode ? (
        <div>
          <h3 className='mb-3 text-[17px] font-semibold'>Tags</h3>
          {isEditMode && (
            <div className='mb-4 flex gap-2'>
              <Input
                type='text'
                value={newTag}
                onChange={(e) => onNewTagChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onAddTag()
                  }
                }}
                placeholder='Add a tag...'
                variant='ghost'
                size='small'
                isDark={isDark}
                className='flex-1'
              />
              <Button
                onClick={onAddTag}
                variant='secondary'
                size='small'
                shape='pill'
                iconOnly>
                <RiAddLine className='h-3.5 w-3.5' />
              </Button>
            </div>
          )}
          <div className='flex flex-wrap gap-2'>
            {editedAgent.tags?.map((tag) => (
              <div
                key={tag}
                className={cn(
                  'group relative rounded-full border px-3 py-1 text-[11px] transition-all',
                  isEditMode && 'pr-7',
                  isDark
                    ? 'border-white/10 bg-white/5 text-white/50'
                    : 'border-black/5 bg-black/[0.02] text-black/50',
                )}>
                <span className='relative z-10'>{tag}</span>
                {isEditMode && (
                  <Button
                    onClick={() => onRemoveTag(tag)}
                    variant='secondary'
                    size='small'
                    shape='pill'
                    iconOnly
                    className='absolute right-1 top-1/2 !h-4 !w-4 -translate-y-1/2 !p-0 opacity-0 group-hover:opacity-100'>
                    <RiCloseLine className='h-2.5 w-2.5' />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
