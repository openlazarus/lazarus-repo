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
  RiShieldCheckLine,
  RiTerminalLine,
} from '@remixicon/react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import Spinner from '@/components/ui/spinner'
import { TextArea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'
import { getSourceLogoPath } from '@/lib/source-logos'
import { cn } from '@/lib/utils'
import { getToolDisplayName } from '@/lib/utils/tool-display-names'
import { ClaudeCodeAgent } from '@/model/claude-code-agent'

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

interface AgentDetailConfigProps {
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

export function AgentDetailConfig({
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
}: AgentDetailConfigProps) {
  return (
    <div className='space-y-6 pt-4'>
      {/* Instructions */}
      <div>
        <h3 className='mb-3 text-[14px] font-medium'>Instructions</h3>
        {isEditMode ? (
          <TextArea
            value={editedAgent.systemPrompt}
            onChange={(e) => onUpdateField('systemPrompt', e.target.value)}
            placeholder="Describe your agent's personality and what it should do..."
            rows={15}
            variant='ghost'
            size='small'
            isDark={isDark}
            className='font-mono text-[12px]'
            resizable={false}
            helperText='Write instructions as if you were explaining to a new team member how to behave and what their job is.'
          />
        ) : (
          <div className='max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed'>
            {editedAgent.systemPrompt}
          </div>
        )}
      </div>

      {/* Capabilities */}
      <div>
        <h3 className='mb-3 text-[14px] font-medium'>
          Capabilities ({editedAgent.allowedTools.length})
        </h3>
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
                  'flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] transition-all',
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
        <h3 className='mb-3 text-[14px] font-medium'>
          Sources
          {editedAgent.activeMCPs && editedAgent.activeMCPs.length > 0 && (
            <span
              className={cn(
                'ml-2 text-[11px] font-normal',
                isDark ? 'text-white/50' : 'text-black/50',
              )}>
              (
              {
                editedAgent.activeMCPs.filter((name) =>
                  availableMCPs.some(
                    (m) => m.name === name && m.enabled !== false,
                  ),
                ).length
              }
              )
            </span>
          )}
        </h3>
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
            {availableMCPs
              .filter((mcp) => mcp.enabled !== false)
              .map((mcp) => {
                const logoPath = getSourceLogoPath(mcp.preset_id, mcp.name)
                const IconComponent = getMCPIcon(mcp.name)
                const isActive = editedAgent.activeMCPs?.includes(mcp.name)

                return (
                  <button
                    key={mcp.name}
                    onClick={() => isEditMode && onToggleMCP(mcp.name)}
                    disabled={!isEditMode}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] transition-all',
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
        <p
          className={cn(
            'mt-3 text-[11px]',
            isDark ? 'text-white/40' : 'text-black/40',
          )}>
          Select which sources this agent can use. If none are selected, all
          workspace sources will be available.
        </p>
      </div>

      {/* Permission Channel */}
      {isEditMode && (
        <div>
          <h3 className='mb-3 flex items-center gap-2 text-[14px] font-medium'>
            <RiShieldCheckLine size={16} />
            Permission Channel
          </h3>
          <p
            className={cn(
              'mb-3 text-[11px]',
              isDark ? 'text-white/40' : 'text-black/40',
            )}>
            When this agent runs in the background and encounters a tool that
            requires approval, it can send a permission request through a
            communication channel instead of auto-denying.
          </p>
          <div className='space-y-3'>
            <Toggle
              label='Enable permission channel'
              checked={editedAgent.permissionChannel?.enabled ?? false}
              onChange={(checked) => {
                onUpdateField('permissionChannel', {
                  ...editedAgent.permissionChannel,
                  enabled: checked,
                  platform:
                    editedAgent.permissionChannel?.platform || 'whatsapp',
                  timeoutMinutes:
                    editedAgent.permissionChannel?.timeoutMinutes ?? 5,
                })
              }}
              size='small'
              isDark={isDark}
            />
            {editedAgent.permissionChannel?.enabled && (
              <div className='space-y-3 pl-1'>
                <div>
                  <label
                    className={cn(
                      'mb-1 block text-[11px] font-medium',
                      isDark ? 'text-white/60' : 'text-black/60',
                    )}>
                    Platform
                  </label>
                  <Select
                    value={
                      editedAgent.permissionChannel?.platform || 'whatsapp'
                    }
                    onValueChange={(value) =>
                      onUpdateField('permissionChannel', {
                        ...editedAgent.permissionChannel,
                        platform: value,
                      })
                    }
                    variant='ghost'
                    size='small'
                    isDark={isDark}>
                    <option value='whatsapp'>WhatsApp</option>
                    <option value='discord' disabled>
                      Discord (coming soon)
                    </option>
                    <option value='slack' disabled>
                      Slack (coming soon)
                    </option>
                    <option value='email' disabled>
                      Email (coming soon)
                    </option>
                  </Select>
                </div>

                {editedAgent.permissionChannel?.platform === 'whatsapp' && (
                  <>
                    <div>
                      <label
                        className={cn(
                          'mb-1 block text-[11px] font-medium',
                          isDark ? 'text-white/60' : 'text-black/60',
                        )}>
                        Phone Number ID
                      </label>
                      <Input
                        type='text'
                        value={
                          editedAgent.permissionChannel?.phoneNumberId || ''
                        }
                        onChange={(e) =>
                          onUpdateField('permissionChannel', {
                            ...editedAgent.permissionChannel,
                            phoneNumberId: e.target.value,
                          })
                        }
                        placeholder="Agent's WhatsApp phone number ID"
                        variant='ghost'
                        size='small'
                        isDark={isDark}
                      />
                    </div>
                    <div>
                      <label
                        className={cn(
                          'mb-1 block text-[11px] font-medium',
                          isDark ? 'text-white/60' : 'text-black/60',
                        )}>
                        Target Phone Number
                      </label>
                      <Input
                        type='text'
                        value={editedAgent.permissionChannel?.targetPhone || ''}
                        onChange={(e) =>
                          onUpdateField('permissionChannel', {
                            ...editedAgent.permissionChannel,
                            targetPhone: e.target.value,
                          })
                        }
                        placeholder='+1234567890'
                        variant='ghost'
                        size='small'
                        isDark={isDark}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label
                    className={cn(
                      'mb-1 block text-[11px] font-medium',
                      isDark ? 'text-white/60' : 'text-black/60',
                    )}>
                    Timeout (minutes)
                  </label>
                  <Input
                    type='number'
                    value={editedAgent.permissionChannel?.timeoutMinutes ?? 5}
                    onChange={(e) =>
                      onUpdateField('permissionChannel', {
                        ...editedAgent.permissionChannel,
                        timeoutMinutes: Math.max(
                          1,
                          Math.min(30, parseInt(e.target.value) || 5),
                        ),
                      })
                    }
                    min={1}
                    max={30}
                    variant='ghost'
                    size='small'
                    isDark={isDark}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Permission Channel (read-only view) */}
      {!isEditMode && editedAgent.permissionChannel?.enabled && (
        <div>
          <h3 className='mb-3 flex items-center gap-2 text-[14px] font-medium'>
            <RiShieldCheckLine size={16} />
            Permission Channel
          </h3>
          <div
            className={cn(
              'rounded-lg border px-3 py-2 text-[12px]',
              isDark
                ? 'border-white/10 bg-white/5'
                : 'border-black/5 bg-black/[0.02]',
            )}>
            <span className='capitalize'>
              {editedAgent.permissionChannel.platform}
            </span>
            {editedAgent.permissionChannel.targetPhone && (
              <span
                className={cn(
                  'ml-2',
                  isDark ? 'text-white/50' : 'text-black/50',
                )}>
                {editedAgent.permissionChannel.targetPhone}
              </span>
            )}
            <span
              className={cn(
                'ml-2',
                isDark ? 'text-white/40' : 'text-black/40',
              )}>
              ({editedAgent.permissionChannel.timeoutMinutes || 5} min timeout)
            </span>
          </div>
        </div>
      )}

      {/* Tags */}
      {(editedAgent.tags && editedAgent.tags.length > 0) || isEditMode ? (
        <div>
          <h3 className='mb-3 text-[14px] font-medium'>Tags</h3>
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
