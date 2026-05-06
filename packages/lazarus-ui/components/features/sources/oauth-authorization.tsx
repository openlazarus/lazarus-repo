'use client'

import {
  RiCheckLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiLockLine,
  RiRefreshLine,
  RiTimeLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import Spinner from '@/components/ui/spinner'
import type { MCPOAuthState } from '@/hooks/features/mcp/types'
import { useGetMcpOAuthStatus } from '@/hooks/features/mcp/use-get-mcp-oauth-status'
import { useInitiateMcpOAuth } from '@/hooks/features/mcp/use-initiate-mcp-oauth'
import { useMarkMcpAuthorized } from '@/hooks/features/mcp/use-mark-mcp-authorized'
import { cn } from '@/lib/utils'

interface OAuthAuthorizationProps {
  workspaceId: string
  serverName: string
  oauthState?: MCPOAuthState
  authInstructions?: string
  isDark: boolean
  onAuthorizationComplete?: () => void
  compact?: boolean
}

export function OAuthAuthorization({
  workspaceId,
  serverName,
  oauthState: initialOAuthState,
  authInstructions,
  isDark,
  onAuthorizationComplete,
  compact = false,
}: OAuthAuthorizationProps) {
  const [oauthState, setOAuthState] = useState<MCPOAuthState | undefined>(
    initialOAuthState,
  )
  const [isInitiating, setIsInitiating] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [initiateOAuthMutation] = useInitiateMcpOAuth(workspaceId, serverName)
  const { data: oauthStatusData, mutate: refreshOAuthStatus } =
    useGetMcpOAuthStatus(workspaceId, serverName)
  const [markAuthorizedMutation] = useMarkMcpAuthorized(workspaceId, serverName)

  // Update state when prop changes
  useEffect(() => {
    setOAuthState(initialOAuthState)
  }, [initialOAuthState])

  const initiateOAuth = useCallback(async () => {
    setIsInitiating(true)
    setError(null)

    try {
      const result = await initiateOAuthMutation({})

      if (result?.error) {
        setError(result.error)
        setOAuthState(result.oauthState)
      } else if (result?.authorizationUrl) {
        setOAuthState(result.oauthState)
        window.open(result.authorizationUrl, '_blank', 'noopener,noreferrer')
      } else if (result) {
        setOAuthState(result.oauthState)
        if (result.oauthState.status === 'authorized') {
          onAuthorizationComplete?.()
        }
      }
    } catch (err) {
      setError('Failed to initiate authorization')
      console.error('OAuth initiation error:', err)
    } finally {
      setIsInitiating(false)
    }
  }, [initiateOAuthMutation, onAuthorizationComplete])

  const checkAuthorizationStatus = useCallback(async () => {
    setIsChecking(true)
    setError(null)

    try {
      await refreshOAuthStatus()
      const result = oauthStatusData
      if (result?.oauthState) {
        setOAuthState(result.oauthState)
        if (result.oauthState.status === 'authorized') {
          onAuthorizationComplete?.()
        }
      }
    } catch (err) {
      setError('Failed to check authorization status')
      console.error('OAuth status check error:', err)
    } finally {
      setIsChecking(false)
    }
  }, [refreshOAuthStatus, oauthStatusData, onAuthorizationComplete])

  const markAsAuthorized = useCallback(async () => {
    setIsChecking(true)
    setError(null)

    try {
      const result = await markAuthorizedMutation({})
      if (result?.oauthState) setOAuthState(result.oauthState)
      onAuthorizationComplete?.()
    } catch (err) {
      setError('Failed to mark as authorized')
      console.error('Mark authorized error:', err)
    } finally {
      setIsChecking(false)
    }
  }, [markAuthorizedMutation, onAuthorizationComplete])

  const openAuthUrl = useCallback(() => {
    if (oauthState?.authorizationUrl) {
      window.open(oauthState.authorizationUrl, '_blank', 'noopener,noreferrer')
    }
  }, [oauthState?.authorizationUrl])

  // Render different states
  const renderStatus = () => {
    if (!oauthState || oauthState.status === 'not_required') {
      return null
    }

    switch (oauthState.status) {
      case 'authorized':
        return (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex items-center gap-2 rounded-lg p-3',
              isDark ? 'bg-green-500/10' : 'bg-green-50',
            )}>
            <RiCheckLine
              size={18}
              className={isDark ? 'text-green-400' : 'text-green-600'}
            />
            <div className='flex-1'>
              <p
                className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-green-400' : 'text-green-700',
                )}>
                Authorized
              </p>
              {oauthState.authorizedAt && (
                <p
                  className={cn(
                    'text-xs',
                    isDark ? 'text-green-400/60' : 'text-green-600/60',
                  )}>
                  Connected{' '}
                  {new Date(oauthState.authorizedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </m.div>
        )

      case 'pending':
        return (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className='space-y-3'>
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg p-3',
                isDark ? 'bg-yellow-500/10' : 'bg-yellow-50',
              )}>
              <RiTimeLine
                size={18}
                className={isDark ? 'text-yellow-400' : 'text-yellow-600'}
              />
              <div className='flex-1'>
                <p
                  className={cn(
                    'text-sm font-medium',
                    isDark ? 'text-yellow-400' : 'text-yellow-700',
                  )}>
                  Authorization pending
                </p>
                <p
                  className={cn(
                    'text-xs',
                    isDark ? 'text-yellow-400/60' : 'text-yellow-600/60',
                  )}>
                  Complete authorization in the browser window
                </p>
              </div>
            </div>

            <div className='space-y-2'>
              <Button
                onClick={initiateOAuth}
                variant='active'
                size='small'
                disabled={isInitiating}
                iconLeft={
                  isInitiating ? (
                    <Spinner size='sm' />
                  ) : (
                    <RiExternalLinkLine size={14} />
                  )
                }
                className='w-full'>
                {isInitiating
                  ? 'Starting authorization...'
                  : 'Open authorization link'}
              </Button>
            </div>

            <div className='flex gap-2'>
              <Button
                onClick={checkAuthorizationStatus}
                variant='secondary'
                size='small'
                disabled={isChecking}
                iconLeft={
                  isChecking ? (
                    <Spinner size='sm' />
                  ) : (
                    <RiRefreshLine size={14} />
                  )
                }
                className='flex-1'>
                Check status
              </Button>
              <Button
                onClick={markAsAuthorized}
                variant='secondary'
                size='small'
                disabled={isChecking}
                className='flex-1'>
                I've authorized
              </Button>
            </div>
          </m.div>
        )

      case 'expired':
        return (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className='space-y-3'>
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg p-3',
                isDark ? 'bg-orange-500/10' : 'bg-orange-50',
              )}>
              <RiTimeLine
                size={18}
                className={isDark ? 'text-orange-400' : 'text-orange-600'}
              />
              <div className='flex-1'>
                <p
                  className={cn(
                    'text-sm font-medium',
                    isDark ? 'text-orange-400' : 'text-orange-700',
                  )}>
                  Authorization expired
                </p>
                <p
                  className={cn(
                    'text-xs',
                    isDark ? 'text-orange-400/60' : 'text-orange-600/60',
                  )}>
                  Re-authorize to continue using this source
                </p>
              </div>
            </div>
            <Button
              onClick={initiateOAuth}
              variant='active'
              size='small'
              disabled={isInitiating}
              iconLeft={
                isInitiating ? (
                  <Spinner size='sm' />
                ) : (
                  <RiExternalLinkLine size={14} />
                )
              }
              className='w-full'>
              Re-authorize
            </Button>
          </m.div>
        )

      case 'error':
        return (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className='space-y-3'>
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg p-3',
                isDark ? 'bg-red-500/10' : 'bg-red-50',
              )}>
              <RiErrorWarningLine
                size={18}
                className={isDark ? 'text-red-400' : 'text-red-600'}
              />
              <div className='flex-1'>
                <p
                  className={cn(
                    'text-sm font-medium',
                    isDark ? 'text-red-400' : 'text-red-700',
                  )}>
                  Authorization error
                </p>
                {oauthState.error && (
                  <p
                    className={cn(
                      'text-xs',
                      isDark ? 'text-red-400/60' : 'text-red-600/60',
                    )}>
                    {oauthState.error}
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={initiateOAuth}
              variant='active'
              size='small'
              disabled={isInitiating}
              iconLeft={
                isInitiating ? (
                  <Spinner size='sm' />
                ) : (
                  <RiExternalLinkLine size={14} />
                )
              }
              className='w-full'>
              Try again
            </Button>
          </m.div>
        )

      default:
        return null
    }
  }

  // Show initial authorization prompt if not yet initiated
  const showInitialPrompt =
    !oauthState ||
    oauthState.status === 'not_required' ||
    (!oauthState.authorizationUrl &&
      oauthState.status !== 'authorized' &&
      oauthState.status !== 'error')

  if (compact) {
    // Compact mode for inline display
    if (oauthState?.status === 'authorized') {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs',
            isDark ? 'text-green-400' : 'text-green-600',
          )}>
          <RiCheckLine size={12} />
          Authorized
        </span>
      )
    }

    if (oauthState?.status === 'pending') {
      return (
        <button
          onClick={initiateOAuth}
          disabled={isInitiating}
          className={cn(
            'inline-flex items-center gap-1 text-xs underline',
            isDark ? 'text-yellow-400' : 'text-yellow-600',
          )}>
          {isInitiating ? (
            <Spinner size='sm' />
          ) : (
            <RiExternalLinkLine size={12} />
          )}
          Authorize
        </button>
      )
    }

    return (
      <button
        onClick={initiateOAuth}
        disabled={isInitiating}
        className={cn(
          'inline-flex items-center gap-1 text-xs underline',
          isDark ? 'text-blue-400' : 'text-blue-600',
        )}>
        {isInitiating ? <Spinner size='sm' /> : <RiLockLine size={12} />}
        Authorize
      </button>
    )
  }

  return (
    <div className='space-y-4'>
      {/* Instructions */}
      {authInstructions && showInitialPrompt && (
        <p
          className={cn('text-sm', isDark ? 'text-white/60' : 'text-black/60')}>
          {authInstructions}
        </p>
      )}

      {/* Error message */}
      {error && (
        <div
          className={cn(
            'rounded-lg p-3 text-sm',
            isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600',
          )}>
          {error}
        </div>
      )}

      {/* Status display or initial prompt */}
      {showInitialPrompt && !oauthState?.authorizationUrl ? (
        <div className='space-y-3'>
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg p-3',
              isDark ? 'bg-blue-500/10' : 'bg-blue-50',
            )}>
            <RiLockLine
              size={18}
              className={isDark ? 'text-blue-400' : 'text-blue-600'}
            />
            <div className='flex-1'>
              <p
                className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-blue-400' : 'text-blue-700',
                )}>
                Authorization required
              </p>
              <p
                className={cn(
                  'text-xs',
                  isDark ? 'text-blue-400/60' : 'text-blue-600/60',
                )}>
                Click below to connect your account
              </p>
            </div>
          </div>
          <Button
            onClick={initiateOAuth}
            variant='active'
            size='small'
            disabled={isInitiating}
            iconLeft={
              isInitiating ? (
                <Spinner size='sm' />
              ) : (
                <RiExternalLinkLine size={14} />
              )
            }
            className='w-full'>
            {isInitiating ? 'Starting authorization...' : 'Authorize'}
          </Button>
        </div>
      ) : (
        renderStatus()
      )}
    </div>
  )
}
