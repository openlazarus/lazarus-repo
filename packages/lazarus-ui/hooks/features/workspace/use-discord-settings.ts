'use client'

import { useWorkspace } from '@/hooks/core/use-workspace'
import {
  useAuthGetWorkspaceApi,
  useAuthPutWorkspaceApi,
} from '@/hooks/data/use-workspace-api'

export interface CapabilityConfig {
  enabled: boolean
  allowedBy: 'everyone' | 'roles'
  roleIds?: string[]
}

export type DiscordManagementCapability =
  | 'channel_create'
  | 'channel_delete'
  | 'channel_modify'
  | 'role_create'
  | 'role_delete'
  | 'role_modify'
  | 'role_assign'

export interface DiscordSettings {
  respondToMentions: boolean
  respondToDMs: boolean
  useThreads: boolean
  channelWhitelist: string[]
  channelBlacklist: string[]
  interactionAccess: {
    allowedBy: 'everyone' | 'roles'
    roleIds?: string[]
  }
  managementCapabilities: Partial<
    Record<DiscordManagementCapability, CapabilityConfig>
  >
}

export interface DiscordRole {
  id: string
  name: string
  color: string
  position: number
  memberCount: number
}

export interface DiscordChannel {
  id: string
  name: string
  parentName: string | null
}

interface DiscordSettingsResponse {
  connectionId: string
  guildId: string
  guildName: string
  enabled: boolean
  settings: DiscordSettings
  requiredPermissions: string
  requiredPermissionsWithAdmin: string
}

interface GuildRolesResponse {
  guildId: string
  guildName: string
  roles: DiscordRole[]
}

interface GuildChannelsResponse {
  guildId: string
  guildName: string
  channels: DiscordChannel[]
}

interface UpdateSettingsResponse {
  success: boolean
  settings: DiscordSettings
  requiredPermissions: string
  requiredPermissionsWithAdmin: string
}

export function useDiscordSettings(connectionId: string | undefined) {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id
  const enabled = !!workspaceId && !!connectionId

  const params = workspaceId ? { workspaceId } : {}

  const {
    data: settingsData,
    loading: settingsLoading,
    error: settingsError,
    mutate: mutateSettings,
  } = useAuthGetWorkspaceApi<DiscordSettingsResponse>({
    path: `/api/workspaces/discord/${connectionId}/settings`,
    params,
    enabled,
  })

  const { data: rolesData, loading: rolesLoading } =
    useAuthGetWorkspaceApi<GuildRolesResponse>({
      path: `/api/workspaces/discord/${connectionId}/guild-roles`,
      params,
      enabled,
    })

  const { data: channelsData } = useAuthGetWorkspaceApi<GuildChannelsResponse>({
    path: `/api/workspaces/discord/${connectionId}/guild-channels`,
    params,
    enabled,
  })

  const [callUpdate, { loading: saving }] =
    useAuthPutWorkspaceApi<UpdateSettingsResponse>({
      path: `/api/workspaces/discord/${connectionId}/settings`,
      params,
      onSuccess: (result) => {
        if (result?.success) {
          mutateSettings()
        }
      },
    })

  const updateSettings = async (updates: Partial<DiscordSettings>) => {
    await callUpdate(updates)
  }

  return {
    data: settingsData?.connectionId ? settingsData : null,
    roles: rolesData?.roles ?? [],
    channels: channelsData?.channels ?? [],
    loading: settingsLoading,
    saving,
    rolesLoading,
    error: settingsError ? 'Failed to load Discord settings' : null,
    updateSettings,
    refetch: mutateSettings,
  }
}
