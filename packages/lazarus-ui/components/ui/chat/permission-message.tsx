'use client'

import { RiMailLine } from '@remixicon/react'
import * as m from 'motion/react-m'
import { memo, useState } from 'react'

import { Button, Modal } from '@/components/ui'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import { formatToolName } from '@/utils/format-tool-name'

import { ShieldIcon } from '../icons/shield'

export interface PermissionRequest {
  requestId: string
  sessionId: string
  conversationId?: string
  claudeSessionId?: string
  toolName: string
  toolUseId?: string
  parameters: any
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskDisplay: string
  description: string
  factors?: string[]
  timestamp: string
}

interface PermissionMessageProps {
  request: PermissionRequest
  onRespond: (
    sessionId: string,
    requestId: string,
    allowed: boolean,
    reason?: string,
  ) => void
  isResponded?: boolean
  response?: { allowed: boolean; reason?: string }
}

// Risk level color classes - explicit to avoid Tailwind purging
const riskColors = {
  low: {
    bg: 'bg-[hsl(var(--lazarus-blue)/0.1)]',
    text: 'text-[hsl(var(--lazarus-blue))]',
    border: 'border-[hsl(var(--lazarus-blue)/0.2)]',
  },
  medium: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    border: 'border-amber-500/20',
  },
  high: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
    border: 'border-orange-500/20',
  },
  critical: {
    bg: 'bg-[hsl(var(--destructive)/0.1)]',
    text: 'text-[hsl(var(--destructive))]',
    border: 'border-[hsl(var(--destructive)/0.2)]',
  },
}

// Truncate text to a word boundary
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  return (
    (lastSpace > maxLength * 0.7
      ? truncated.substring(0, lastSpace)
      : truncated) + '...'
  )
}

export const PermissionMessage = memo<PermissionMessageProps>(
  ({ request, onRespond, isResponded = false, response }) => {
    const [showDetails, setShowDetails] = useState(false)
    const [showEmailModal, setShowEmailModal] = useState(false)
    const { isDark } = useTheme()

    const handleAllow = () => {
      onRespond(request.sessionId, request.requestId, true, 'User approved')
    }

    const handleDeny = () => {
      onRespond(request.sessionId, request.requestId, false, 'User denied')
    }

    const colors = riskColors[request.riskLevel]

    return (
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'mb-4 rounded-[18px] p-4',
          'bg-[hsl(var(--muted))] dark:bg-[hsl(var(--chat-agent-bg))]',
          'shadow-[0_1px_0.5px_rgba(0,0,0,0.07)]',
          isResponded && 'opacity-60',
        )}>
        {/* Header */}
        <div className='mb-3 flex items-start gap-3'>
          <div
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
              colors.bg,
            )}>
            <ShieldIcon size={16} className={colors.text} />
          </div>

          <div className='flex-1'>
            <div className='mb-1 flex items-center gap-2'>
              <span className='text-[14px] font-semibold text-[hsl(var(--foreground))]'>
                Permission required
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  colors.bg,
                  colors.text,
                )}>
                {request.riskDisplay}
              </span>
            </div>

            <p className='text-[13px] text-[hsl(var(--text-secondary))]'>
              {request.description}
            </p>

            {/* Tool Info */}
            <div className='mt-2'>
              <span className='text-[12px] text-[hsl(var(--text-tertiary))]'>
                Tool:{' '}
                <span className='font-mono text-[hsl(var(--text-secondary))]'>
                  {formatToolName(request.toolName)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        {request.factors && request.factors.length > 0 && (
          <div className='mb-3 ml-11'>
            <p className='mb-1 text-[12px] text-[hsl(var(--text-tertiary))]'>
              Risk factors:
            </p>
            <ul className='space-y-0.5'>
              {request.factors
                .slice(0, showDetails ? undefined : 2)
                .map((factor, idx) => (
                  <li key={idx} className='flex items-start gap-2'>
                    <span className={cn('mt-0.5 text-[10px]', colors.text)}>
                      -
                    </span>
                    <span className='text-[13px] text-[hsl(var(--text-secondary))]'>
                      {factor}
                    </span>
                  </li>
                ))}
            </ul>
            {request.factors.length > 2 && !showDetails && (
              <button
                onClick={() => setShowDetails(true)}
                className='mt-1 text-[12px] text-[hsl(var(--lazarus-blue))] hover:underline'>
                Show {request.factors.length - 2} more...
              </button>
            )}
          </div>
        )}

        {/* Email Preview - show when sending email */}
        {request.toolName.includes('email_send') && request.parameters && (
          <div className='mb-3 ml-11'>
            <div
              className={cn(
                'rounded-[12px] border p-3',
                'border-[hsl(var(--border))] bg-[hsl(var(--background))]',
              )}>
              <div className='space-y-2 text-[13px]'>
                {request.parameters.to && (
                  <div className='flex gap-2'>
                    <span className='flex-shrink-0 text-[hsl(var(--text-tertiary))]'>
                      To:
                    </span>
                    <span className='text-[hsl(var(--text-primary))]'>
                      {Array.isArray(request.parameters.to)
                        ? request.parameters.to.join(', ')
                        : request.parameters.to}
                    </span>
                  </div>
                )}
                {request.parameters.subject && (
                  <div className='flex gap-2'>
                    <span className='flex-shrink-0 text-[hsl(var(--text-tertiary))]'>
                      Subject:
                    </span>
                    <span className='font-medium text-[hsl(var(--text-primary))]'>
                      {request.parameters.subject}
                    </span>
                  </div>
                )}
                {request.parameters.body && (
                  <div className='mt-2 border-t border-[hsl(var(--border))] pt-2'>
                    <p className='whitespace-pre-wrap text-[hsl(var(--text-secondary))]'>
                      {truncateText(request.parameters.body, 120)}
                    </p>
                    {request.parameters.body.length > 120 && (
                      <button
                        onClick={() => setShowEmailModal(true)}
                        className='mt-2 text-[12px] text-[hsl(var(--lazarus-blue))] hover:underline'>
                        View full email
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Parameters Preview (collapsible) - hide for email_send since we show custom preview */}
        {showDetails &&
          request.parameters &&
          !request.toolName.includes('email_send') && (
            <div className='mb-3 ml-11'>
              <p className='mb-1 text-[12px] text-[hsl(var(--text-tertiary))]'>
                Parameters:
              </p>
              <pre
                className={cn(
                  'max-h-32 overflow-auto rounded-[8px] p-2 text-[11px]',
                  'bg-[hsl(var(--background))] text-[hsl(var(--text-secondary))]',
                )}>
                {JSON.stringify(request.parameters, null, 2)}
              </pre>
            </div>
          )}

        {/* Show/Hide Details Toggle - hide for email_send since we show custom preview */}
        {!showDetails &&
          request.parameters &&
          !request.toolName.includes('email_send') && (
            <button
              onClick={() => setShowDetails(true)}
              className='mb-3 ml-11 text-[12px] text-[hsl(var(--lazarus-blue))] hover:underline'>
              Show technical details
            </button>
          )}

        {/* Actions or Result */}
        {!isResponded ? (
          <div className='ml-11 flex gap-2'>
            <m.div className='flex-1' whileTap={{ opacity: 0.8 }}>
              <Button
                variant='secondary'
                onClick={handleDeny}
                className='h-9 w-full text-[13px]'>
                Deny
              </Button>
            </m.div>
            <m.div className='flex-1' whileTap={{ opacity: 0.8 }}>
              <Button
                variant='primary'
                onClick={handleAllow}
                className={cn(
                  'h-9 w-full text-[13px]',
                  request.riskLevel === 'critical' &&
                    'bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.9)]',
                )}>
                {request.riskLevel === 'critical'
                  ? 'Allow (dangerous)'
                  : 'Allow'}
              </Button>
            </m.div>
          </div>
        ) : (
          <div className='ml-11'>
            <div
              className={cn(
                'flex items-center gap-2 text-[13px]',
                response?.allowed
                  ? 'text-[hsl(var(--lazarus-blue))]'
                  : 'text-[hsl(var(--destructive))]',
              )}>
              <span className='font-medium'>
                {response?.allowed ? 'Allowed' : 'Denied'}
              </span>
              {response?.reason && (
                <span className='text-[hsl(var(--text-tertiary))]'>
                  - {response.reason}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Warning for high-risk */}
        {!isResponded &&
          (request.riskLevel === 'high' ||
            request.riskLevel === 'critical') && (
            <div
              className={cn(
                'ml-11 mt-3 rounded-[8px] p-2 text-[12px]',
                request.riskLevel === 'critical'
                  ? 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]'
                  : 'bg-orange-500/10 text-orange-500',
              )}>
              {request.riskLevel === 'critical'
                ? 'Critical: This could severely damage your system.'
                : 'High risk: This could have significant consequences.'}
            </div>
          )}

        {/* Email Preview Modal */}
        {request.toolName.includes('email_send') && request.parameters && (
          <Modal
            isOpen={showEmailModal}
            isDark={isDark}
            onClose={() => setShowEmailModal(false)}
            size='lg'
            className='max-h-[80vh] overflow-hidden'>
            <div className='mb-4 flex items-center gap-3'>
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  'bg-[hsl(var(--lazarus-blue)/0.1)]',
                )}>
                <RiMailLine className='h-5 w-5 text-[hsl(var(--lazarus-blue))]' />
              </div>
              <div>
                <h3
                  className={cn(
                    'text-[16px] font-semibold',
                    isDark ? 'text-foreground' : 'text-[#1a1a1a]',
                  )}>
                  Email preview
                </h3>
                <p
                  className={cn(
                    'text-[13px]',
                    isDark ? 'text-foreground/60' : 'text-[#666666]',
                  )}>
                  Review the email before sending
                </p>
              </div>
            </div>

            <div
              className={cn(
                'max-h-[calc(80vh-140px)] overflow-y-auto rounded-xl border p-4',
                isDark
                  ? 'border-white/10 bg-white/5'
                  : 'border-black/10 bg-black/[0.02]',
              )}>
              <div className='space-y-3 text-[14px]'>
                {request.parameters.to && (
                  <div className='flex gap-3'>
                    <span
                      className={cn(
                        'flex-shrink-0 font-medium',
                        isDark ? 'text-foreground/50' : 'text-[#888888]',
                      )}>
                      To:
                    </span>
                    <span
                      className={isDark ? 'text-foreground' : 'text-[#1a1a1a]'}>
                      {Array.isArray(request.parameters.to)
                        ? request.parameters.to.join(', ')
                        : request.parameters.to}
                    </span>
                  </div>
                )}
                {request.parameters.subject && (
                  <div className='flex gap-3'>
                    <span
                      className={cn(
                        'flex-shrink-0 font-medium',
                        isDark ? 'text-foreground/50' : 'text-[#888888]',
                      )}>
                      Subject:
                    </span>
                    <span
                      className={cn(
                        'font-semibold',
                        isDark ? 'text-foreground' : 'text-[#1a1a1a]',
                      )}>
                      {request.parameters.subject}
                    </span>
                  </div>
                )}
                {request.parameters.body && (
                  <div
                    className={cn(
                      'mt-4 border-t pt-4',
                      isDark ? 'border-white/10' : 'border-black/10',
                    )}>
                    <p
                      className={cn(
                        'whitespace-pre-wrap leading-relaxed',
                        isDark ? 'text-foreground/90' : 'text-[#333333]',
                      )}>
                      {request.parameters.body}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className='mt-4 flex justify-end'>
              <Button
                variant='secondary'
                size='medium'
                onClick={() => setShowEmailModal(false)}>
                Close
              </Button>
            </div>
          </Modal>
        )}
      </m.div>
    )
  },
)

PermissionMessage.displayName = 'PermissionMessage'
