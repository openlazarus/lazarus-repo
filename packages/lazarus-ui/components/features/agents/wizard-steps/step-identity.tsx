'use client'

import {
  RiBookReadLine,
  RiCheckboxCircleLine,
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiEditLine,
  RiFileCopyLine,
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

import { LexicalEditor } from '@/components/ui/lexical/lexical-editor'
import { EditorModePlugin } from '@/components/ui/lexical/plugins/editor-mode-plugin'
import '@/components/ui/lexical/xcode-theme.css'
import Spinner from '@/components/ui/spinner'
import { getSourceLogoPath } from '@/lib/source-logos'
import { cn } from '@/lib/utils'

// Same icon maps as current create-agent-view
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

export const AVAILABLE_TOOLS = [
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

interface StepIdentityProps {
  name: string
  systemPrompt: string
  allowedTools: string[]
  activeMCPs: string[]
  availableMCPs: Array<{ name: string; preset_id?: string; enabled?: boolean }>
  loadingMCPs: boolean
  agentEmail: string
  isDark: boolean
  onNameChange: (name: string) => void
  onSystemPromptChange: (prompt: string) => void
  onToggleTool: (tool: string) => void
  onToggleMCP: (mcp: string) => void
}

export function StepIdentity({
  name,
  systemPrompt,
  allowedTools,
  activeMCPs,
  availableMCPs,
  loadingMCPs,
  agentEmail,
  isDark,
  onNameChange,
  onSystemPromptChange,
  onToggleTool,
  onToggleMCP,
}: StepIdentityProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(agentEmail)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const enabledToolCount = allowedTools.length
  const enabledMCPNames = new Set(
    availableMCPs.filter((m) => m.enabled !== false).map((m) => m.name),
  )
  const enabledSourceCount = activeMCPs.filter((name) =>
    enabledMCPNames.has(name),
  ).length

  return (
    <div className='space-y-5'>
      {/* Name */}
      <div>
        <input
          type='text'
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder='Agent name'
          className={cn(
            'w-full border-none bg-transparent text-[20px] font-semibold tracking-[-0.03em]',
            'placeholder:font-semibold focus:outline-none',
            isDark
              ? 'text-white placeholder:text-white/25'
              : 'text-[#1a1a1a] placeholder:text-black/25',
          )}
        />
        <div className='mt-2 flex items-center gap-1.5'>
          <span
            className={cn(
              'text-[14px] font-semibold',
              isDark ? 'text-white/25' : 'text-black/25',
            )}>
            {agentEmail}
          </span>
          <button
            type='button'
            onClick={handleCopyEmail}
            className={cn(
              'rounded p-1 transition-all',
              isDark ? 'hover:bg-white/10' : 'hover:bg-black/5',
            )}>
            {copiedEmail ? (
              <RiCheckboxCircleLine className='h-3.5 w-3.5 text-green-500' />
            ) : (
              <RiFileCopyLine
                className={cn(
                  'h-3.5 w-3.5',
                  isDark ? 'opacity-25' : 'opacity-25',
                )}
              />
            )}
          </button>
        </div>
      </div>

      {/* Separator */}
      <div
        className={cn('h-px', isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]')}
      />

      {/* System prompt */}
      <div className='min-h-[200px] rounded-lg [&_.lexical-content-editable]:!p-0'>
        <LexicalEditor
          content={systemPrompt}
          editable={true}
          editorKey='wizard-system-prompt'
          placeholder='Describe what this agent should help with, how it should respond, and any rules it should follow. e.g. "You are a customer support agent. Help customers track their orders, answer questions about shipping and returns, and escalate billing issues to the finance team."'
          onChange={(content) => onSystemPromptChange(content)}
          plugins={[<EditorModePlugin key='editor-mode' mode='markdown' />]}
        />
      </div>

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
                      const isActive = allowedTools.includes(tool)

                      return (
                        <button
                          key={tool}
                          type='button'
                          onClick={() => onToggleTool(tool)}
                          className={cn(
                            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-all',
                            isActive
                              ? 'bg-[#0098FC] text-white'
                              : isDark
                                ? 'bg-white/10 text-white/70 hover:bg-white/15'
                                : 'bg-black/10 text-black/70 hover:bg-black/15',
                          )}>
                          <ToolIcon size={14} />
                          {tool}
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
                  {loadingMCPs ? (
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
                          const isActive = activeMCPs.includes(mcp.name)

                          return (
                            <button
                              key={mcp.name}
                              type='button'
                              onClick={() => onToggleMCP(mcp.name)}
                              className={cn(
                                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-all',
                                isActive
                                  ? 'bg-[#0098FC] text-white'
                                  : isDark
                                    ? 'bg-white/10 text-white/70 hover:bg-white/15'
                                    : 'bg-black/10 text-black/70 hover:bg-black/15',
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
    </div>
  )
}
