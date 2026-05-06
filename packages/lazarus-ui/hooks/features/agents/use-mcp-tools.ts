import { useCallback, useEffect, useState } from 'react'

import type { MCPServerTools } from '@/components/features/agents/guardrails/guardrail-types'
import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { api } from '@/lib/api-client'

interface UseMCPToolsReturn {
  mcpServers: MCPServerTools[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Fetches the list of MCP tools available to an agent.
 * Used by the guardrails UI to render per-MCP-tool permission controls.
 */
export function useMCPTools(
  workspaceId: string | undefined,
  agentId: string | undefined,
): UseMCPToolsReturn {
  const [mcpServers, setMcpServers] = useState<MCPServerTools[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTools = useCallback(
    async (forceRefresh = false) => {
      if (!workspaceId || !agentId) {
        setMcpServers([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const query = forceRefresh ? '?refresh=true' : ''
        const baseUrl = getWorkspaceBaseUrl(workspaceId)
        const data = await api.get<Record<string, any>>(
          `${baseUrl}/api/workspaces/agents/${agentId}/mcp-tools${query}`,
          { headers: { 'x-workspace-id': workspaceId } },
        )

        // Transform Record<serverName, { tools, serverDescription }> into MCPServerTools[]
        const servers: MCPServerTools[] = Object.entries(data).map(
          ([serverName, info]: [string, any]) => ({
            serverName,
            serverDescription: info.serverDescription,
            tools: info.tools || [],
          }),
        )

        setMcpServers(servers)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load MCP tools',
        )
        setMcpServers([])
      } finally {
        setLoading(false)
      }
    },
    [workspaceId, agentId],
  )

  useEffect(() => {
    if (workspaceId && agentId) {
      fetchTools()
    } else {
      setMcpServers([])
      setLoading(false)
    }
  }, [workspaceId, agentId, fetchTools])

  const refresh = useCallback(async () => {
    await fetchTools(true)
  }, [fetchTools])

  return { mcpServers, loading, error, refresh }
}
