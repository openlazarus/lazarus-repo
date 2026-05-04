'use client'

import {
  RiAddCircleLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDiscordFill,
  RiLoader4Line,
  RiSettings3Line,
  RiSlackFill,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useSearchParams } from 'next/navigation'
import { ComponentType, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

type IntegrationId = 'slack' | 'discord'

interface Integration {
  id: IntegrationId
  name: string
  description: string
  connected: boolean
  connectionName?: string
  connectionId?: string
  icon: ComponentType<{ className?: string }>
}

interface DiscordConnection {
  id: string
  workspace_id: string
  guild_id: string
  guild_name: string | null
  enabled: boolean
}

interface SlackConnection {
  id: string
  workspace_id: string
  slack_team_id: string
  slack_team_name: string | null
  enabled: boolean
}

interface WorkspaceIntegrationsSectionProps {
  workspaceId: string
}

export function WorkspaceIntegrationsSection({
  workspaceId,
}: WorkspaceIntegrationsSectionProps) {
  const { isDark } = useTheme()
  const searchParams = useSearchParams()
  const [hoveredIntegration, setHoveredIntegration] =
    useState<IntegrationId | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<IntegrationId | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'discord',
      name: 'Discord',
      description: 'Chat with Lazarus agents directly from Discord',
      connected: false,
      icon: RiDiscordFill,
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Chat with Lazarus agents directly from Slack',
      connected: false,
      icon: RiSlackFill,
    },
  ])

  // Check URL params for OAuth callbacks
  useEffect(() => {
    const discordStatus = searchParams.get('discord')
    const slackStatus = searchParams.get('slack')
    const guildName = searchParams.get('guild')
    const teamName = searchParams.get('team')
    const errorMessage = searchParams.get('message')

    if (discordStatus === 'connected' || discordStatus === 'reconnected') {
      setNotification({
        type: 'success',
        message: `Discord ${discordStatus === 'reconnected' ? 'reconnected' : 'connected'} to ${guildName || 'server'}`,
      })
    } else if (discordStatus === 'error') {
      setNotification({
        type: 'error',
        message: `Discord connection failed: ${errorMessage || 'Unknown error'}`,
      })
    }

    if (slackStatus === 'connected' || slackStatus === 'reconnected') {
      setNotification({
        type: 'success',
        message: `Slack ${slackStatus === 'reconnected' ? 'reconnected' : 'connected'} to ${teamName || 'workspace'}`,
      })
    } else if (slackStatus === 'error') {
      setNotification({
        type: 'error',
        message: `Slack connection failed: ${errorMessage || 'Unknown error'}`,
      })
    }

    if (discordStatus || slackStatus) {
      setTimeout(() => setNotification(null), 5000)
    }
  }, [searchParams])

  // Fetch existing connections
  useEffect(() => {
    const fetchConnections = async () => {
      if (!workspaceId) {
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()

        const { data: discordConnections } = await supabase
          .from('discord_connections')
          .select('id, workspace_id, guild_id, guild_name, enabled')
          .eq('workspace_id', workspaceId)
          .eq('enabled', true)

        const { data: slackConnections } = await supabase
          .from('slack_connections')
          .select('id, workspace_id, slack_team_id, slack_team_name, enabled')
          .eq('workspace_id', workspaceId)
          .eq('enabled', true)

        setIntegrations((prev) =>
          prev.map((integration) => {
            if (integration.id === 'discord' && discordConnections?.length) {
              const conn = discordConnections[0] as DiscordConnection
              return {
                ...integration,
                connected: true,
                connectionName: conn.guild_name || 'Discord Server',
                connectionId: conn.id,
              }
            }
            if (integration.id === 'slack' && slackConnections?.length) {
              const conn = slackConnections[0] as SlackConnection
              return {
                ...integration,
                connected: true,
                connectionName: conn.slack_team_name || 'Slack Workspace',
                connectionId: conn.id,
              }
            }
            return integration
          }),
        )
      } catch (error) {
        console.error('Failed to fetch integrations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConnections()
  }, [workspaceId])

  const handleConnect = (id: IntegrationId) => {
    if (!workspaceId) {
      setNotification({
        type: 'error',
        message: 'Workspace not found',
      })
      return
    }

    const state = btoa(JSON.stringify({ workspaceId }))

    if (id === 'discord') {
      const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
      if (!clientId) {
        setNotification({
          type: 'error',
          message: 'Discord integration not configured',
        })
        return
      }

      const redirectUri = `${window.location.origin}/api/auth/callback/discord`
      const scopes = ['bot', 'applications.commands']
      const permissions = '275146411056'

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        permissions,
        state,
      })

      window.location.href = `https://discord.com/api/oauth2/authorize?${params.toString()}`
    } else if (id === 'slack') {
      const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
      if (!clientId) {
        setNotification({
          type: 'error',
          message: 'Slack integration not configured',
        })
        return
      }

      const redirectUri = `${window.location.origin}/api/auth/callback/slack`
      const scopes = [
        'app_mentions:read',
        'channels:history',
        'channels:read',
        'chat:write',
        'commands',
        'im:history',
        'im:read',
        'im:write',
        'users:read',
      ]

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopes.join(','),
        state,
      })

      window.location.href = `https://slack.com/oauth/v2/authorize?${params.toString()}`
    }
  }

  const handleDisconnect = async (id: IntegrationId) => {
    const integration = integrations.find((i) => i.id === id)
    if (!integration?.connectionId) return

    setActionLoading(id)

    try {
      const supabase = createClient()
      const table =
        id === 'discord' ? 'discord_connections' : 'slack_connections'

      const { error } = await supabase
        .from(table)
        .update({ enabled: false })
        .eq('id', integration.connectionId)

      if (error) throw error

      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                connected: false,
                connectionName: undefined,
                connectionId: undefined,
              }
            : i,
        ),
      )

      setNotification({
        type: 'success',
        message: `${integration.name} disconnected`,
      })
    } catch (error) {
      console.error('Failed to disconnect:', error)
      setNotification({
        type: 'error',
        message: `Failed to disconnect ${integration.name}`,
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleIntegrationToggle = (id: IntegrationId) => {
    const integration = integrations.find((i) => i.id === id)
    if (!integration) return

    if (integration.connected) {
      handleDisconnect(id)
    } else {
      handleConnect(id)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center gap-2 py-4'>
        <RiLoader4Line className='h-4 w-4 animate-spin text-foreground/40' />
        <span
          className={cn(
            'text-[12px]',
            isDark ? 'text-white/50' : 'text-black/50',
          )}>
          Loading integrations...
        </span>
      </div>
    )
  }

  const openDiscordSettings = (connectionId: string) => {
    window.dispatchEvent(
      new CustomEvent('openFile', {
        detail: {
          file: {
            name: 'Discord Settings',
            path: `discord-settings/${connectionId}`,
            displayName: 'Discord Settings',
            fileType: 'discord_settings',
          },
          workspace: { id: workspaceId },
        },
      }),
    )
  }

  return (
    <div className='space-y-3'>
      {/* Notification banner */}
      {notification && (
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-md p-3 text-[12px]',
            notification.type === 'success'
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400',
          )}>
          {notification.message}
        </m.div>
      )}

      {/* Integration items */}
      <m.div
        className='space-y-0'
        initial='hidden'
        animate='visible'
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.1,
            },
          },
        }}>
        {integrations.map((integration, index) => (
          <m.div
            key={integration.id}
            className={cn(
              'flex items-center justify-between border-b py-3',
              isDark ? 'border-white/5' : 'border-black/5',
              index === 0 &&
                (isDark
                  ? 'border-t border-t-white/5'
                  : 'border-t border-t-black/5'),
            )}
            variants={{
              hidden: { opacity: 0, x: -20, filter: 'blur(4px)' },
              visible: {
                opacity: 1,
                x: 0,
                filter: 'blur(0px)',
                transition: {
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
            }}>
            <div className='flex items-center gap-3'>
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  isDark ? 'bg-white/5' : 'bg-black/5',
                )}>
                <integration.icon
                  className={cn(
                    'h-4 w-4',
                    isDark ? 'text-white/60' : 'text-black/60',
                  )}
                />
              </div>
              <div>
                <div className='text-[13px] font-medium'>
                  {integration.name}
                </div>
                <div
                  className={cn(
                    'text-[11px]',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}>
                  {integration.connected && integration.connectionName
                    ? `Connected to ${integration.connectionName}`
                    : integration.description}
                </div>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {actionLoading === integration.id ? (
                <RiLoader4Line className='h-4 w-4 animate-spin text-foreground/40' />
              ) : integration.connected ? (
                <div className='flex items-center gap-3'>
                  {integration.id === 'discord' && integration.connectionId && (
                    <Button
                      variant='link'
                      size='small'
                      className={cn(
                        isDark
                          ? 'text-white/40 hover:text-white/70'
                          : 'text-black/40 hover:text-black/70',
                      )}
                      onClick={() =>
                        openDiscordSettings(integration.connectionId!)
                      }>
                      <RiSettings3Line className='h-[14px] w-[14px]' />
                    </Button>
                  )}
                  <div
                    onMouseEnter={() => setHoveredIntegration(integration.id)}
                    onMouseLeave={() => setHoveredIntegration(null)}>
                    <Button
                      variant='link'
                      size='small'
                      className='text-[#0098FC] hover:text-[#0098FC]/80'
                      iconLeft={
                        hoveredIntegration === integration.id ? (
                          <RiCloseCircleLine className='h-[14px] w-[14px]' />
                        ) : (
                          <RiCheckboxCircleLine className='h-[14px] w-[14px]' />
                        )
                      }
                      onClick={() => handleIntegrationToggle(integration.id)}>
                      {hoveredIntegration === integration.id
                        ? 'Disconnect'
                        : 'Connected'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant='secondary'
                  size='small'
                  shape='pill'
                  iconLeft={<RiAddCircleLine className='h-[14px] w-[14px]' />}
                  onClick={() => handleIntegrationToggle(integration.id)}>
                  Connect
                </Button>
              )}
            </div>
          </m.div>
        ))}
      </m.div>
    </div>
  )
}
