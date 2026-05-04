import { useEffect, useState } from 'react'

import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { api } from '@/lib/api-client'
import type {
  KnowledgeArtifact,
  KnowledgeGraph,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
} from '@/model/knowledge'

type MemoryScope = 'workspace' | 'agent' | 'both'

const wsHeaders = (workspaceId: string) => ({ 'x-workspace-id': workspaceId })

function resolveBasePath(workspaceId: string, agentId?: string): string {
  const base = getWorkspaceBaseUrl(workspaceId)
  return agentId
    ? `${base}/api/workspaces/agents/${agentId}/memory`
    : `${base}/api/workspaces/knowledge`
}

interface UseKnowledgeGraphOptions {
  workspaceId: string
  userId: string
  /** When set, loads the agent-private memory graph instead of the workspace graph. */
  agentId?: string
  autoLoad?: boolean
}

export function useKnowledgeGraph(options: UseKnowledgeGraphOptions) {
  const { workspaceId, userId, agentId, autoLoad = true } = options
  const basePath = resolveBasePath(workspaceId, agentId)

  const [graph, setGraph] = useState<KnowledgeGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadGraph = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await api.get<{ graph: KnowledgeGraph }>(basePath, {
        headers: wsHeaders(workspaceId),
      })
      setGraph(data.graph)
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error('Failed to load knowledge graph'),
      )
      console.error('[use-knowledge-graph] Error loading graph:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateGraph = async () => {
    try {
      const data = await api.post<{ graph: KnowledgeGraph }>(
        `${basePath}/update-graph`,
        {},
        { headers: wsHeaders(workspaceId) },
      )

      setGraph(data.graph)
      return data.graph
    } catch (err) {
      console.error('[use-knowledge-graph] Error updating graph:', err)
      throw err
    }
  }

  useEffect(() => {
    if (autoLoad && workspaceId && userId) {
      loadGraph()
    }
  }, [workspaceId, userId, agentId, autoLoad])

  return {
    graph,
    loading,
    error,
    loadGraph,
    updateGraph,
  }
}

interface UseKnowledgeSearchOptions {
  workspaceId: string
  userId: string
  agentId?: string
  query?: KnowledgeSearchQuery
  autoLoad?: boolean
}

export function useKnowledgeSearch(options: UseKnowledgeSearchOptions) {
  const { workspaceId, userId, agentId, query, autoLoad = false } = options
  const basePath = resolveBasePath(workspaceId, agentId)

  const [result, setResult] = useState<KnowledgeSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const search = async (searchQuery?: KnowledgeSearchQuery) => {
    const finalQuery = searchQuery || query

    if (!finalQuery) {
      console.warn('[use-knowledge-search] No query provided')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (finalQuery.query) params.append('q', finalQuery.query)
      if (finalQuery.types) params.append('types', finalQuery.types.join(','))
      if (finalQuery.tags) params.append('tags', finalQuery.tags.join(','))
      if (finalQuery.dateRange?.from)
        params.append('from', finalQuery.dateRange.from)
      if (finalQuery.dateRange?.to) params.append('to', finalQuery.dateRange.to)
      if (finalQuery.relatedTo) params.append('relatedTo', finalQuery.relatedTo)
      if (finalQuery.limit) params.append('limit', finalQuery.limit.toString())
      if (finalQuery.offset)
        params.append('offset', finalQuery.offset.toString())

      const data = await api.get<KnowledgeSearchResult>(
        `${basePath}/search?${params.toString()}`,
        { headers: wsHeaders(workspaceId) },
      )

      setResult(data)
      return data
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to search knowledge'),
      )
      console.error('[use-knowledge-search] Error searching:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoLoad && workspaceId && userId && query) {
      search(query)
    }
  }, [workspaceId, userId, agentId, autoLoad, JSON.stringify(query)])

  return {
    result,
    loading,
    error,
    search,
  }
}

interface UseKnowledgeArtifactOptions {
  workspaceId: string
  userId: string
  artifactId: string
  agentId?: string
  autoLoad?: boolean
}

export function useKnowledgeArtifact(options: UseKnowledgeArtifactOptions) {
  const { workspaceId, userId, artifactId, agentId, autoLoad = true } = options
  const basePath = resolveBasePath(workspaceId, agentId)

  const [artifact, setArtifact] = useState<KnowledgeArtifact | null>(null)
  const [backlinks, setBacklinks] = useState<
    Array<{ id: string; type: string; title: string; filePath: string }>
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadArtifact = async () => {
    if (!artifactId) return

    setLoading(true)
    setError(null)

    try {
      const data = await api.get<{
        artifact: KnowledgeArtifact
        backlinks: Array<{
          id: string
          type: string
          title: string
          filePath: string
        }>
      }>(`${basePath}/artifacts/${artifactId}`, {
        headers: wsHeaders(workspaceId),
      })

      setArtifact(data.artifact)
      setBacklinks(data.backlinks || [])
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to load artifact'),
      )
      console.error('[use-knowledge-artifact] Error loading artifact:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoLoad && workspaceId && userId && artifactId) {
      loadArtifact()
    }
  }, [workspaceId, userId, artifactId, agentId, autoLoad])

  return {
    artifact,
    backlinks,
    loading,
    error,
    loadArtifact,
  }
}

// ── New hooks for the memory scope navigator ─────────────────────────────

interface UseMemoryScopeCountsOptions {
  workspaceId: string
  autoLoad?: boolean
}

export interface MemoryScopeCounts {
  workspace: number
  agents: { agentId: string; agentName: string; count: number }[]
}

export function useMemoryScopeCounts(options: UseMemoryScopeCountsOptions) {
  const { workspaceId, autoLoad = true } = options

  const [counts, setCounts] = useState<MemoryScopeCounts | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<MemoryScopeCounts>(
        `${getWorkspaceBaseUrl(workspaceId)}/api/workspaces/memory/scope-counts`,
        { headers: wsHeaders(workspaceId) },
      )
      setCounts(data)
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to load scope counts'),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoLoad && workspaceId) load()
  }, [workspaceId, autoLoad])

  return { counts, loading, error, reload: load }
}

interface UseAllMemoryOptions {
  workspaceId: string
  autoLoad?: boolean
}

export interface AllMemoryResponse {
  workspace: { artifacts: KnowledgeArtifact[]; total: number }
  agents: {
    agentId: string
    agentName: string
    artifacts: KnowledgeArtifact[]
    total: number
  }[]
}

export function useAllMemory(options: UseAllMemoryOptions) {
  const { workspaceId, autoLoad = true } = options

  const [data, setData] = useState<AllMemoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await api.get<AllMemoryResponse>(
        `${getWorkspaceBaseUrl(workspaceId)}/api/workspaces/memory/all`,
        { headers: wsHeaders(workspaceId) },
      )
      setData(payload)
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to load all memory'),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoLoad && workspaceId) load()
  }, [workspaceId, autoLoad])

  return { data, loading, error, reload: load }
}

export type { MemoryScope }
