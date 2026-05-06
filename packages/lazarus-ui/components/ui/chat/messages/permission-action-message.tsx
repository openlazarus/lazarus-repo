'use client'

import * as m from 'motion/react-m'
import { memo, useState } from 'react'

import Spinner from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { formatToolName } from '@/utils/format-tool-name'

import { ChatMessage, PermissionRequest } from '../types'
import { BaseMessage } from './base-message'

export interface PermissionActionMessageProps {
  message: ChatMessage & {
    variant: {
      type: 'permission'
      request: PermissionRequest
    }
  }
  onRespond?: (
    sessionId: string,
    requestId: string,
    allowed: boolean,
    reason?: string,
  ) => void
  className?: string
  uiVariant?: 'mobile' | 'desktop'
}

// Risk level descriptions
const riskDescriptions: Record<string, string> = {
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
  critical: 'Critical risk',
}

/**
 * PermissionActionMessage - Displays permission requests in Action Message style
 *
 * Follows the pattern:
 * 1. Background action message showing the request
 * 2. Action message with Accept/Reject buttons (when pending)
 * 3. User bubble showing the decision (after response)
 */
export const PermissionActionMessage = memo<PermissionActionMessageProps>(
  ({ message, onRespond, className, uiVariant = 'desktop' }) => {
    const { request } = message.variant
    const [isExpanded, setIsExpanded] = useState(false)

    const isResponded = !!message.metadata?.permissionResponse
    const response = message.metadata?.permissionResponse

    const handleAccept = () => {
      onRespond?.(request.sessionId, request.requestId, true, 'User approved')
    }

    const handleReject = () => {
      onRespond?.(request.sessionId, request.requestId, false, 'User denied')
    }

    const toolDisplayName = formatToolName(request.toolName)
    const riskDescription = `${riskDescriptions[request.riskLevel]} - ${request.description}`

    // Format parameters for display
    const technicalDetails = request.parameters
      ? `Tool: ${request.toolName}\n\nParameters:\n${JSON.stringify(request.parameters, null, 2)}`
      : `Tool: ${request.toolName}`

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {/* Background Action Message - Request Info */}
        <div className='flex px-4 py-1.5 text-sm'>
          <div className='flex max-w-[85%] gap-2'>
            {/* Status Icon */}
            <div className='flex shrink-0 pt-0.5'>
              {!isResponded ? (
                <Spinner size='sm' className='shrink-0' />
              ) : response?.allowed ? (
                <i
                  className='ri-checkbox-circle-line shrink-0 text-[14px]'
                  style={{ color: '#0098FC' }}
                />
              ) : (
                <i className='ri-close-circle-line shrink-0 text-[14px] text-red-500' />
              )}
            </div>

            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-1.5 text-gray-500'>
                <span className='break-words text-[13px] font-medium leading-[18px]'>
                  Lazarus is requesting permission to use {toolDisplayName}
                  {!isResponded && '...'}
                </span>

                {/* Expand button */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className='shrink-0 text-gray-400 transition-colors hover:text-gray-500'
                  aria-label={
                    isExpanded
                      ? 'Hide technical details'
                      : 'Show technical details'
                  }>
                  <i
                    className={cn(
                      'text-base transition-transform duration-300 ease-out',
                      isExpanded
                        ? 'ri-arrow-up-s-line'
                        : 'ri-arrow-down-s-line',
                    )}
                  />
                </button>
              </div>

              {/* Risk description */}
              <div
                className='mt-0.5 break-words text-xs leading-[16px] text-gray-400'
                title={riskDescription}>
                {riskDescription}
              </div>

              {/* Expandable Technical Details */}
              <div
                className={cn(
                  'grid transition-all duration-300 ease-out',
                  isExpanded
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0',
                )}>
                <div className='overflow-hidden'>
                  <pre className='mt-2 whitespace-pre-wrap break-words rounded-lg bg-black/5 p-2 text-xs leading-[18px] text-gray-500 dark:bg-white/5'>
                    {technicalDetails}
                  </pre>

                  {/* Risk factors if available */}
                  {request.factors && request.factors.length > 0 && (
                    <div className='mt-2 text-xs text-gray-500'>
                      <span className='font-medium'>Risk factors:</span>
                      <ul className='mt-1 list-inside list-disc space-y-0.5'>
                        {request.factors.map((factor, idx) => (
                          <li key={idx}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Message with Accept/Reject - Only when not responded */}
        {!isResponded && (
          <BaseMessage
            message={{
              ...message,
              role: 'assistant',
            }}
            showBubble={true}
            uiVariant={uiVariant}>
            <div className='space-y-1.5'>
              <m.button
                onClick={handleAccept}
                className={cn(
                  'action-row w-full rounded-lg px-3 py-2.5',
                  'text-left text-[15px] transition-colors duration-200',
                  'text-[#0098FC] hover:text-[#0077CC]',
                  'dark:text-[#4DB8FF] dark:hover:text-[#80CCFF]',
                  'hover:bg-gray-100/50 dark:hover:bg-white/10',
                )}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{
                  scale: 0.96,
                  transition: {
                    type: 'spring',
                    stiffness: 400,
                    damping: 40,
                    mass: 0.8,
                  },
                }}
                transition={{
                  y: {
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8,
                  },
                }}>
                Accept
              </m.button>

              <m.button
                onClick={handleReject}
                className={cn(
                  'action-row w-full rounded-lg px-3 py-2.5',
                  'text-left text-[15px] transition-colors duration-200',
                  'text-[#0098FC] hover:text-[#0077CC]',
                  'dark:text-[#4DB8FF] dark:hover:text-[#80CCFF]',
                  'hover:bg-gray-100/50 dark:hover:bg-white/10',
                )}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{
                  scale: 0.96,
                  transition: {
                    type: 'spring',
                    stiffness: 400,
                    damping: 40,
                    mass: 0.8,
                  },
                }}
                transition={{
                  y: {
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8,
                    delay: 0.02,
                  },
                }}>
                Reject
              </m.button>
            </div>
          </BaseMessage>
        )}

        {/* User Decision Bubble - After response */}
        {isResponded && response && (
          <BaseMessage
            message={{
              ...message,
              role: 'user',
            }}
            uiVariant={uiVariant}>
            <div className='flex items-center gap-1'>
              <i
                className={cn(
                  'text-[16px] text-white',
                  response.allowed
                    ? 'ri-checkbox-circle-line'
                    : 'ri-close-circle-line',
                )}
              />
              <span className='font-medium text-white'>
                {response.allowed ? 'Allowed' : 'Denied'}
              </span>
            </div>
          </BaseMessage>
        )}
      </div>
    )
  },
)

PermissionActionMessage.displayName = 'PermissionActionMessage'
