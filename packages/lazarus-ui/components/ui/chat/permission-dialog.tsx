'use client'

import { memo, useState } from 'react'

import { Button, Typography } from '@/components/ui'
import { DefaultModal } from '@/components/ui/modal'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

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

interface PermissionDialogProps {
  request: PermissionRequest | null
  onRespond: (
    sessionId: string,
    requestId: string,
    allowed: boolean,
    reason?: string,
  ) => void
  className?: string
}

export const PermissionDialog = memo<PermissionDialogProps>(
  ({ request, onRespond, className }) => {
    const { isDark } = useTheme()
    const [customReason, setCustomReason] = useState('')

    if (!request) return null

    const handleAllow = () => {
      onRespond(
        request.sessionId,
        request.requestId,
        true,
        customReason || 'User approved',
      )
      setCustomReason('')
    }

    const handleDeny = () => {
      onRespond(
        request.sessionId,
        request.requestId,
        false,
        customReason || 'User denied',
      )
      setCustomReason('')
    }

    return (
      <DefaultModal
        isOpen={!!request}
        isDark={isDark}
        onClose={handleDeny}
        size='md'
        showCloseButton={false}
        className={className}>
        {/* Header */}
        <div className='mb-4 flex items-center gap-3'>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              request.riskLevel === 'low' &&
                (isDark ? 'bg-green-500/20' : 'bg-green-500/10'),
              request.riskLevel === 'medium' &&
                (isDark ? 'bg-yellow-500/20' : 'bg-yellow-500/10'),
              request.riskLevel === 'high' &&
                (isDark ? 'bg-orange-500/20' : 'bg-orange-500/10'),
              request.riskLevel === 'critical' &&
                (isDark ? 'bg-red-500/20' : 'bg-red-500/10'),
            )}>
            <ShieldIcon
              size={20}
              className={cn(
                request.riskLevel === 'low' && 'text-green-500',
                request.riskLevel === 'medium' && 'text-yellow-500',
                request.riskLevel === 'high' && 'text-orange-500',
                request.riskLevel === 'critical' && 'text-red-500',
              )}
            />
          </div>
          <div className='flex-1'>
            <div className='flex items-center gap-2'>
              <Typography variant='h3' className='font-semibold'>
                Permission Required
              </Typography>
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium',
                  request.riskLevel === 'low' &&
                    'bg-green-500/20 text-green-500',
                  request.riskLevel === 'medium' &&
                    'bg-yellow-500/20 text-yellow-500',
                  request.riskLevel === 'high' &&
                    'bg-orange-500/20 text-orange-500',
                  request.riskLevel === 'critical' &&
                    'bg-red-500/20 text-red-500',
                )}>
                {request.riskDisplay}
              </span>
            </div>
            <Typography variant='caption' className='text-gray-500'>
              AI wants to perform an action
            </Typography>
          </div>
        </div>

        {/* Content */}
        <div className='space-y-4'>
          <div
            className={cn(
              'rounded-lg p-3',
              isDark ? 'bg-white/5' : 'bg-black/5',
            )}>
            <Typography variant='body' className='mb-1 font-medium'>
              Tool: {request.toolName}
            </Typography>
            <Typography variant='caption' className='text-gray-500'>
              {request.description}
            </Typography>
          </div>

          {/* Risk Factors */}
          {request.factors && request.factors.length > 0 && (
            <div>
              <Typography variant='caption' className='mb-1 text-gray-500'>
                Risk Factors:
              </Typography>
              <ul className='space-y-1'>
                {request.factors.map((factor, idx) => (
                  <li key={idx} className='flex items-start gap-2'>
                    <span className='mt-0.5 text-yellow-500'>•</span>
                    <Typography variant='caption'>{factor}</Typography>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Parameters Preview */}
          {request.parameters && (
            <div>
              <Typography variant='caption' className='mb-1 text-gray-500'>
                Parameters:
              </Typography>
              <pre
                className={cn(
                  'max-h-32 overflow-auto rounded-lg p-2 text-xs',
                  isDark ? 'bg-white/5' : 'bg-black/5',
                )}>
                {JSON.stringify(request.parameters, null, 2)}
              </pre>
            </div>
          )}

          {/* Custom reason input */}
          <div>
            <Typography variant='caption' className='mb-1 text-gray-500'>
              Add note (optional):
            </Typography>
            <input
              type='text'
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder='Optional reason for your decision...'
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                isDark
                  ? 'border-white/10 bg-white/5 text-white placeholder-white/30 focus:border-white/20'
                  : 'border-gray-200 bg-white text-black placeholder-gray-400 focus:border-gray-300',
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className='mt-6 flex gap-2'>
          <Button variant='secondary' onClick={handleDeny} className='flex-1'>
            Deny
          </Button>
          <Button variant='primary' onClick={handleAllow} className='flex-1'>
            Allow
          </Button>
        </div>

        {/* Warning for high-risk operations */}
        {(request.riskLevel === 'high' || request.riskLevel === 'critical') && (
          <div
            className={cn(
              'mt-4 rounded-lg p-3 text-xs',
              request.riskLevel === 'critical'
                ? isDark
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-red-100 text-red-700'
                : isDark
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'bg-orange-50 text-orange-600',
            )}>
            <Typography variant='caption'>
              {request.riskLevel === 'critical'
                ? 'CRITICAL: This operation could severely damage your system. Extreme caution advised.'
                : 'HIGH RISK: This operation could have significant consequences. Review carefully.'}
            </Typography>
          </div>
        )}

        {/* Session Info */}
        <div className='mt-4 border-t border-gray-200 pt-4 dark:border-white/10'>
          <Typography variant='caption' className='text-xs text-gray-400'>
            Session: {request.sessionId.slice(0, 20)}...
          </Typography>
        </div>
      </DefaultModal>
    )
  },
)

PermissionDialog.displayName = 'PermissionDialog'
