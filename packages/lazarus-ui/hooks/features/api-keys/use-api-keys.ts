/**
 * Custom hook for API key management
 *
 * Provides functions to create, list, and revoke API keys for workspaces.
 * All routes hit the workspace VM via header-based workspaceId.
 */

import useSWR from 'swr'

import { useAuth } from '@/hooks/auth/use-auth'
import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { api } from '@/lib/api-client'

export interface ApiKey {
  id: string
  serverId: string
  name: string
  keyPrefix: string
  workspaceName?: string
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
  createdBy: string
  permissions: {
    databases: string[]
    operations: ('read' | 'write' | 'delete')[]
  }
  rateLimit: number
}

export interface CreateApiKeyParams {
  serverId: string
  name: string
  databases?: string[]
  operations?: ('read' | 'write' | 'delete')[]
  expiresInDays?: number
  rateLimit?: number
}

export interface ApiKeyWithSecret extends Omit<ApiKey, 'keyPrefix'> {
  key: string
}

const wsHeaders = (workspaceId: string) => ({ 'x-workspace-id': workspaceId })

/**
 * Hook to list API keys for a workspace.
 */
export function useApiKeys(workspaceId: string | null) {
  const { profile } = useAuth()

  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    keys: ApiKey[]
  }>(
    workspaceId && profile ? ['workspace-api-keys', workspaceId] : null,
    async () => {
      const baseUrl = getWorkspaceBaseUrl(workspaceId!)
      return api.get<{ success: boolean; keys: ApiKey[] }>(
        `${baseUrl}/api/workspaces/api-keys`,
        { headers: wsHeaders(workspaceId!) },
      )
    },
  )

  return {
    apiKeys: data?.keys || [],
    isLoading,
    error,
    mutate,
  }
}

/**
 * Hook to list all API keys across all user workspaces.
 *
 * Backend route `/api/workspaces/all` is workspace-VM-mounted but doesn't
 * require workspace context. We hit the orchestrator directly since the
 * orchestrator proxies through to the relevant workspace.
 */
export function useAllApiKeys() {
  const { profile } = useAuth()

  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    keys: ApiKey[]
  }>(profile ? `/api/workspaces/all` : null, async (url: string) => {
    return api.get<{ success: boolean; keys: ApiKey[] }>(url)
  })

  return {
    apiKeys: data?.keys || [],
    isLoading,
    error,
    mutate,
  }
}

/**
 * Create a new API key (imperative — used in event handlers).
 */
export async function createApiKey(
  params: CreateApiKeyParams,
): Promise<ApiKeyWithSecret> {
  const baseUrl = getWorkspaceBaseUrl(params.serverId)
  const data = await api.post<{ apiKey: ApiKeyWithSecret }>(
    `${baseUrl}/api/workspaces/api-keys`,
    {
      name: params.name,
      databases: params.databases,
      operations: params.operations,
      expiresInDays: params.expiresInDays,
      rateLimit: params.rateLimit,
    },
    { headers: wsHeaders(params.serverId) },
  )
  return data.apiKey
}

export async function revokeApiKey(
  workspaceId: string,
  keyId: string,
): Promise<void> {
  const baseUrl = getWorkspaceBaseUrl(workspaceId)
  await api.delete(`${baseUrl}/api/workspaces/api-keys/${keyId}`, {
    headers: wsHeaders(workspaceId),
  })
}

export async function getApiKey(
  workspaceId: string,
  keyId: string,
): Promise<ApiKey> {
  const baseUrl = getWorkspaceBaseUrl(workspaceId)
  const data = await api.get<{ key: ApiKey }>(
    `${baseUrl}/api/workspaces/api-keys/${keyId}`,
    { headers: wsHeaders(workspaceId) },
  )
  return data.key
}
