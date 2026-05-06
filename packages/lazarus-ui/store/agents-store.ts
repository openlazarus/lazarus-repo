import { create } from 'zustand'

import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { api } from '@/lib/api-client'

/**
 * Workspace Agent interface matching the backend response
 */
export interface WorkspaceAgent {
  id: string
  name: string
  description: string
  enabled: boolean
  systemPrompt: string
  allowedTools: string[]
  modelConfig: {
    model: string
    temperature?: number
    maxTokens?: number
  }
  mcpServers?: Record<string, unknown>
  metadata: {
    created: string
    updated: string
    author: string
    tags: string[]
    isSystemAgent: boolean
  }
}

interface AgentsStoreState {
  // State per workspace
  agentsByWorkspace: Record<string, WorkspaceAgent[]>
  loadingByWorkspace: Record<string, boolean>
  errorByWorkspace: Record<string, string | null>

  // Internal dedup guard per workspace
  _fetchPromises: Record<string, Promise<void>>

  // Actions
  fetchAgents: (workspaceId: string, userId: string) => Promise<void>
  addAgent: (workspaceId: string, agent: WorkspaceAgent) => void
  updateAgent: (
    workspaceId: string,
    agentId: string,
    updates: Partial<WorkspaceAgent>,
  ) => void
  removeAgent: (workspaceId: string, agentId: string) => void
  invalidateWorkspace: (workspaceId: string) => void

  // Selectors
  getAgents: (workspaceId: string) => WorkspaceAgent[]
  getEnabledAgents: (workspaceId: string) => WorkspaceAgent[]
  isLoading: (workspaceId: string) => boolean
  getError: (workspaceId: string) => string | null
}

/**
 * Agents Store
 * Global state management for workspace agents using Zustand
 * This allows the agent selector dropdown to update when agents are created/deleted
 */
export const useAgentsStore = create<AgentsStoreState>()((set, get) => ({
  // Initial state
  agentsByWorkspace: {},
  loadingByWorkspace: {},
  errorByWorkspace: {},
  _fetchPromises: {},

  // Fetch agents for a workspace — deduped via promise guard
  fetchAgents: async (workspaceId: string, userId: string) => {
    if (!workspaceId || !userId) {
      return
    }

    const state = get()

    // If a fetch is already in-flight for this workspace, share the promise
    if (state._fetchPromises[workspaceId]) {
      return state._fetchPromises[workspaceId]
    }

    const promise = (async () => {
      set((s) => ({
        loadingByWorkspace: {
          ...s.loadingByWorkspace,
          [workspaceId]: true,
        },
        errorByWorkspace: {
          ...s.errorByWorkspace,
          [workspaceId]: null,
        },
      }))

      try {
        const baseUrl = getWorkspaceBaseUrl(workspaceId)
        const data = await api.get<{ agents: WorkspaceAgent[] }>(
          `${baseUrl}/api/workspaces/agents`,
          { headers: { 'x-workspace-id': workspaceId } },
        )

        const agents = data.agents || []

        set((s) => ({
          agentsByWorkspace: {
            ...s.agentsByWorkspace,
            [workspaceId]: agents,
          },
          loadingByWorkspace: {
            ...s.loadingByWorkspace,
            [workspaceId]: false,
          },
        }))
      } catch (err) {
        console.error('[AgentsStore] Failed to fetch agents:', err)
        set((s) => ({
          errorByWorkspace: {
            ...s.errorByWorkspace,
            [workspaceId]: err instanceof Error ? err.message : 'Unknown error',
          },
          loadingByWorkspace: {
            ...s.loadingByWorkspace,
            [workspaceId]: false,
          },
        }))
      }
    })()

    set((s) => ({
      _fetchPromises: { ...s._fetchPromises, [workspaceId]: promise },
    }))

    try {
      await promise
    } finally {
      set((s) => {
        const { [workspaceId]: _, ...rest } = s._fetchPromises
        return { _fetchPromises: rest }
      })
    }
  },

  // Add an agent to a workspace
  addAgent: (workspaceId: string, agent: WorkspaceAgent) => {
    set((state) => {
      const currentAgents = state.agentsByWorkspace[workspaceId] || []
      // Avoid duplicates
      const exists = currentAgents.some((a) => a.id === agent.id)
      if (exists) {
        return state
      }
      return {
        agentsByWorkspace: {
          ...state.agentsByWorkspace,
          [workspaceId]: [...currentAgents, agent],
        },
      }
    })
  },

  // Update an agent in a workspace
  updateAgent: (
    workspaceId: string,
    agentId: string,
    updates: Partial<WorkspaceAgent>,
  ) => {
    set((state) => {
      const currentAgents = state.agentsByWorkspace[workspaceId] || []
      return {
        agentsByWorkspace: {
          ...state.agentsByWorkspace,
          [workspaceId]: currentAgents.map((agent) =>
            agent.id === agentId ? { ...agent, ...updates } : agent,
          ),
        },
      }
    })
  },

  // Remove an agent from a workspace
  removeAgent: (workspaceId: string, agentId: string) => {
    set((state) => {
      const currentAgents = state.agentsByWorkspace[workspaceId] || []
      return {
        agentsByWorkspace: {
          ...state.agentsByWorkspace,
          [workspaceId]: currentAgents.filter((agent) => agent.id !== agentId),
        },
      }
    })
  },

  // Invalidate a workspace's agents (forces refetch next time)
  invalidateWorkspace: (workspaceId: string) => {
    set((state) => {
      const newAgentsByWorkspace = { ...state.agentsByWorkspace }
      delete newAgentsByWorkspace[workspaceId]
      return {
        agentsByWorkspace: newAgentsByWorkspace,
      }
    })
  },

  // Get all agents for a workspace
  getAgents: (workspaceId: string) => {
    return get().agentsByWorkspace[workspaceId] || []
  },

  // Get only enabled agents for a workspace
  getEnabledAgents: (workspaceId: string) => {
    const agents = get().agentsByWorkspace[workspaceId] || []
    return agents.filter((agent) => agent.enabled)
  },

  // Check if loading for a workspace
  isLoading: (workspaceId: string) => {
    return get().loadingByWorkspace[workspaceId] ?? false
  },

  // Get error for a workspace
  getError: (workspaceId: string) => {
    return get().errorByWorkspace[workspaceId] ?? null
  },
}))
