'use client'

import { useState } from 'react'

import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiFileEditLine,
  RiLinkM,
  RiMailLine,
  RiTimeLine,
} from '@remixicon/react'

import { cn } from '@/lib/utils'
import { formatDuration, formatTokenCount, Log } from '@/model/log'

interface ExecutionSummaryPanelProps {
  log: Log
  isDark: boolean
}

function StatItem({
  label,
  value,
  isDark,
}: {
  label: string
  value: string
  isDark: boolean
}) {
  return (
    <div className='flex flex-col items-center gap-0.5'>
      <span
        className={cn(
          'text-[13px] font-medium tabular-nums',
          isDark ? 'text-white/80' : 'text-black/80',
        )}>
        {value}
      </span>
      <span
        className={cn(
          'text-[10px] uppercase tracking-wider',
          isDark ? 'text-white/35' : 'text-black/35',
        )}>
        {label}
      </span>
    </div>
  )
}

function Divider({ isDark }: { isDark: boolean }) {
  return (
    <div className={cn('h-8 w-px', isDark ? 'bg-white/10' : 'bg-black/10')} />
  )
}

export function ExecutionSummaryPanel({
  log,
  isDark,
}: ExecutionSummaryPanelProps) {
  const [expanded, setExpanded] = useState(false)

  const duration = log.metadata?.totalDuration
  const messageCount = log.conversation?.length || 0
  const toolCount = log.apps?.length || 0
  const totalTokens = log.tokenUsage?.totalTokens
  const triggerType = log.executionContext?.triggeredBy
  const filesModified = log.filesModified || []

  // Derive start time from first conversation message if available
  const startTime = log.conversation?.[0]?.timestamp
    ? new Date(log.conversation[0].timestamp)
    : new Date(log.timestamp)

  const hasMetrics =
    duration || messageCount > 0 || toolCount > 0 || totalTokens

  if (!hasMetrics) return null

  return (
    <div
      className={cn(
        'shrink-0 border-b',
        isDark
          ? 'border-white/10 bg-white/[0.02]'
          : 'border-black/10 bg-black/[0.01]',
      )}>
      {/* Stats Row */}
      <div className='flex items-center justify-center gap-5 px-4 py-3'>
        <StatItem
          label='Started'
          value={startTime.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
          isDark={isDark}
        />
        <Divider isDark={isDark} />
        <StatItem
          label='Duration'
          value={formatDuration(duration)}
          isDark={isDark}
        />
        <Divider isDark={isDark} />
        <StatItem
          label='Messages'
          value={messageCount > 0 ? `${messageCount}` : '--'}
          isDark={isDark}
        />
        <Divider isDark={isDark} />
        <StatItem
          label='Tools'
          value={toolCount > 0 ? `${toolCount}` : '--'}
          isDark={isDark}
        />
        <Divider isDark={isDark} />
        <StatItem
          label='Tokens'
          value={formatTokenCount(totalTokens)}
          isDark={isDark}
        />
      </div>

      {/* Expandable Details */}
      {(triggerType ||
        log.executionContext?.originalPrompt ||
        filesModified.length > 0) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'flex w-full items-center justify-center gap-1 py-1 text-[11px] transition-colors',
              isDark
                ? 'text-white/30 hover:text-white/50'
                : 'text-black/30 hover:text-black/50',
            )}>
            {expanded ? 'Less details' : 'More details'}
            {expanded ? (
              <RiArrowUpSLine className='h-3.5 w-3.5' />
            ) : (
              <RiArrowDownSLine className='h-3.5 w-3.5' />
            )}
          </button>

          {expanded && (
            <div className='space-y-3 px-4 pb-3'>
              {/* Trigger Info */}
              {triggerType && triggerType !== 'user' && (
                <div className='flex items-center gap-2'>
                  <span
                    className={cn(
                      'text-[11px]',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}>
                    Triggered by:
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      triggerType === 'email'
                        ? 'bg-blue-500/10 text-blue-400'
                        : triggerType === 'webhook'
                          ? 'bg-purple-500/10 text-purple-400'
                          : triggerType === 'schedule'
                            ? 'bg-amber-500/10 text-amber-400'
                            : isDark
                              ? 'bg-white/5 text-white/60'
                              : 'bg-black/5 text-black/60',
                    )}>
                    {triggerType === 'email' && (
                      <RiMailLine className='h-3 w-3' />
                    )}
                    {triggerType === 'webhook' && (
                      <RiLinkM className='h-3 w-3' />
                    )}
                    {triggerType === 'schedule' && (
                      <RiTimeLine className='h-3 w-3' />
                    )}
                    {triggerType}
                  </span>
                  {log.executionContext?.triggerDetails && (
                    <span
                      className={cn(
                        'text-[11px]',
                        isDark ? 'text-white/50' : 'text-black/50',
                      )}>
                      {typeof log.executionContext.triggerDetails === 'string'
                        ? log.executionContext.triggerDetails
                        : log.executionContext.triggerDetails.subject ||
                          log.executionContext.triggerDetails.name ||
                          ''}
                    </span>
                  )}
                </div>
              )}

              {/* Original Prompt */}
              {log.executionContext?.originalPrompt && (
                <div>
                  <span
                    className={cn(
                      'mb-1 block text-[11px]',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}>
                    Original prompt:
                  </span>
                  <p
                    className={cn(
                      'line-clamp-3 rounded px-2 py-1.5 text-[12px]',
                      isDark
                        ? 'bg-white/5 text-white/70'
                        : 'bg-black/5 text-black/70',
                    )}>
                    {log.executionContext.originalPrompt}
                  </p>
                </div>
              )}

              {/* Files Modified */}
              {filesModified.length > 0 && (
                <div>
                  <span
                    className={cn(
                      'mb-1 block text-[11px]',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}>
                    Files modified ({filesModified.length}):
                  </span>
                  <div className='space-y-1'>
                    {filesModified.slice(0, 10).map((file, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex items-center gap-2 rounded px-2 py-1 text-[11px]',
                          isDark ? 'bg-white/5' : 'bg-black/5',
                        )}>
                        <RiFileEditLine
                          className={cn(
                            'h-3 w-3 shrink-0',
                            file.action === 'created'
                              ? 'text-green-400'
                              : file.action === 'deleted'
                                ? 'text-red-400'
                                : isDark
                                  ? 'text-white/40'
                                  : 'text-black/40',
                          )}
                        />
                        <span
                          className={cn(
                            'flex-1 truncate font-mono',
                            isDark ? 'text-white/60' : 'text-black/60',
                          )}>
                          {file.path}
                        </span>
                        {(file.linesAdded || file.linesRemoved) && (
                          <span className='flex gap-1 text-[10px]'>
                            {file.linesAdded ? (
                              <span className='text-green-400'>
                                +{file.linesAdded}
                              </span>
                            ) : null}
                            {file.linesRemoved ? (
                              <span className='text-red-400'>
                                -{file.linesRemoved}
                              </span>
                            ) : null}
                          </span>
                        )}
                      </div>
                    ))}
                    {filesModified.length > 10 && (
                      <span
                        className={cn(
                          'block text-[11px]',
                          isDark ? 'text-white/30' : 'text-black/30',
                        )}>
                        +{filesModified.length - 10} more files
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Token Breakdown */}
              {log.tokenUsage && (
                <div className='flex items-center gap-4'>
                  <span
                    className={cn(
                      'text-[11px]',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}>
                    Tokens:
                  </span>
                  <span
                    className={cn(
                      'text-[11px] tabular-nums',
                      isDark ? 'text-white/50' : 'text-black/50',
                    )}>
                    {formatTokenCount(log.tokenUsage.inputTokens)} in /{' '}
                    {formatTokenCount(log.tokenUsage.outputTokens)} out
                  </span>
                  {log.tokenUsage.model && (
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px]',
                        isDark
                          ? 'bg-white/5 text-white/40'
                          : 'bg-black/5 text-black/40',
                      )}>
                      {log.tokenUsage.model}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
