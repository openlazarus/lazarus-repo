'use client'

import {
  RiBarChartLine,
  RiFilter3Line,
  RiGitBranchLine,
  RiListCheck,
  RiRefreshLine,
  RiSearchLine,
} from '@remixicon/react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { useKnowledgeGraph } from '@/hooks/features/knowledge/use-knowledge-graph'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import { ArtifactType, KnowledgeArtifact } from '@/model/knowledge'

import { ArtifactCard } from './artifact-card'
import { ArtifactViewer } from './artifact-viewer'
import { KnowledgeGraphCanvas } from './knowledge-graph-canvas'

interface KnowledgeGraphViewProps {
  workspaceId: string
  userId: string
  /** When set, loads the agent-private memory (.agents/{agentId}/memory) instead of the workspace memory (.knowledge/). */
  agentId?: string
  /** Optional header label override (e.g., "Alice's Memory"). */
  scopeLabel?: string
}

const typeColors = {
  event: '#00d4ff',
  concept: '#a855f7',
  pattern: '#52c41a',
  context: '#faad14',
}

const typeLabels = {
  event: 'Event',
  concept: 'Concept',
  pattern: 'Pattern',
  context: 'Context',
}

export function KnowledgeGraphView({
  workspaceId,
  userId,
  agentId,
  scopeLabel,
}: KnowledgeGraphViewProps) {
  const { isDark } = useTheme()
  const router = useRouter()

  console.log('[KnowledgeGraphView] Initializing with:', {
    workspaceId,
    userId,
    agentId,
  })

  const { graph, loading, error, loadGraph, updateGraph } = useKnowledgeGraph({
    workspaceId,
    userId,
    agentId,
    autoLoad: true,
  })

  console.log('[KnowledgeGraphView] State:', {
    hasGraph: !!graph,
    loading,
    error: error?.message,
    nodeCount: graph?.nodes?.length || 0,
    edgeCount: graph?.edges?.length || 0,
  })

  const [viewMode, setViewMode] = useState<'list' | 'graph' | 'stats'>('graph')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<ArtifactType>>(
    new Set(),
  )
  const [selectedArtifact, setSelectedArtifact] =
    useState<KnowledgeArtifact | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filter artifacts based on search and type filters
  const filteredNodes = useMemo(() => {
    if (!graph) return []

    let filtered = graph.nodes

    // Filter by type
    if (selectedTypes.size > 0) {
      filtered = filtered.filter((node) => selectedTypes.has(node.type))
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (node) =>
          node.title.toLowerCase().includes(query) ||
          node.tags.some((tag) => tag.toLowerCase().includes(query)),
      )
    }

    return filtered
  }, [graph, selectedTypes, searchQuery])

  const toggleType = (type: ArtifactType) => {
    const newTypes = new Set(selectedTypes)
    if (newTypes.has(type)) {
      newTypes.delete(type)
    } else {
      newTypes.add(type)
    }
    setSelectedTypes(newTypes)
  }

  const handleRefresh = async () => {
    await updateGraph()
    await loadGraph()
  }

  if (loading && !graph) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-center'>
          <div
            className={cn(
              'mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2',
              isDark
                ? 'border-zinc-700 border-t-zinc-400'
                : 'border-[#e5e5e7] border-t-[#86868b]',
            )}></div>
          <p
            className={cn(
              'text-sm',
              isDark ? 'text-zinc-500' : 'text-[#86868b]',
            )}>
            Loading knowledge graph...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='max-w-md text-center'>
          <p
            className={cn('mb-2', isDark ? 'text-zinc-400' : 'text-[#86868b]')}>
            Failed to load knowledge graph
          </p>
          <p
            className={cn(
              'mb-2 text-sm',
              isDark ? 'text-zinc-600' : 'text-[#a1a1a6]',
            )}>
            {error.message}
          </p>
          <p
            className={cn(
              'mb-4 font-mono text-xs',
              isDark ? 'text-zinc-700' : 'text-[#d4d4d8]',
            )}>
            API: {getWorkspaceBaseUrl(workspaceId)}/api/knowledge
          </p>
          <button
            onClick={loadGraph}
            className={cn(
              'mt-4 rounded-lg px-4 py-2 text-sm transition-colors',
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700'
                : 'bg-[#fafafa] hover:bg-[#e5e5e7]',
            )}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!graph) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p
          className={cn(
            'text-sm',
            isDark ? 'text-zinc-500' : 'text-[#86868b]',
          )}>
          No knowledge graph available
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col',
        isDark ? 'bg-[#1a1a1a]' : 'bg-white',
      )}>
      {/* Compact header */}
      <div
        className={cn(
          'border-b px-6 py-3',
          isDark ? 'border-white/[0.06]' : 'border-black/[0.06]',
        )}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-6'>
            <h2
              className={cn(
                'text-[16px] font-semibold tracking-[-0.02em]',
                isDark ? 'text-white' : 'text-black',
              )}>
              {scopeLabel || 'Memory Package'}
            </h2>
            <div
              className={cn(
                'flex items-center gap-2 text-[12px]',
                isDark ? 'text-white/40' : 'text-black/40',
              )}>
              <span className='flex items-center gap-1'>
                <span style={{ color: '#52c41a' }}>
                  {graph.stats.totalArtifacts}
                </span>{' '}
                artifacts
              </span>
              <span className='opacity-30'>•</span>
              <span className='flex items-center gap-1'>
                <span style={{ color: '#00d4ff' }}>
                  {graph.stats.totalLinks}
                </span>{' '}
                links
              </span>
              <span className='opacity-30'>•</span>
              <span className='flex items-center gap-1'>
                <span style={{ color: '#faad14' }}>
                  {graph.stats.totalTags}
                </span>{' '}
                tags
              </span>
            </div>
          </div>

          {/* Controls row */}
          <div className='flex items-center gap-2'>
            <div className='relative'>
              <RiSearchLine
                className={cn(
                  'pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2',
                  isDark ? 'text-white/25' : 'text-black/25',
                )}
              />
              <input
                type='text'
                placeholder='Search...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-48 rounded-md border px-2.5 py-1.5 pl-8 text-[12px] transition-all duration-200 focus:outline-none',
                  isDark
                    ? 'border-white/[0.06] bg-[#232323]/60 text-white placeholder-white/25 focus:border-white/15 focus:bg-[#232326]/80'
                    : 'border-black/[0.06] bg-white/40 text-black placeholder-black/25 focus:border-black/15 focus:bg-white/60',
                )}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'group rounded-md border p-1.5 transition-all duration-200',
                showFilters
                  ? isDark
                    ? 'border-white/15 bg-white/[0.06]'
                    : 'border-black/15 bg-black/[0.06]'
                  : isDark
                    ? 'border-white/[0.06] hover:border-white/15 hover:bg-white/[0.03]'
                    : 'border-black/[0.06] hover:border-black/15 hover:bg-black/[0.03]',
              )}>
              <RiFilter3Line
                className={cn(
                  'h-3.5 w-3.5 transition-colors',
                  isDark
                    ? 'text-white/40 group-hover:text-white/60'
                    : 'text-black/40 group-hover:text-black/60',
                )}
              />
            </button>

            <div
              className={cn(
                'flex overflow-hidden rounded-md border',
                isDark ? 'border-white/[0.06]' : 'border-black/[0.06]',
              )}>
              {[
                { mode: 'graph', icon: RiGitBranchLine },
                { mode: 'list', icon: RiListCheck },
                { mode: 'stats', icon: RiBarChartLine },
              ].map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as typeof viewMode)}
                  className={cn(
                    'group relative border-r p-1.5 transition-all duration-200 last:border-r-0',
                    isDark ? 'border-white/[0.06]' : 'border-black/[0.06]',
                    viewMode === mode
                      ? isDark
                        ? 'bg-white/[0.06]'
                        : 'bg-black/[0.06]'
                      : isDark
                        ? 'hover:bg-white/[0.03]'
                        : 'hover:bg-black/[0.03]',
                  )}>
                  {viewMode === mode && (
                    <div
                      className='absolute bottom-0 left-0 h-0.5 w-full'
                      style={{
                        background: isDark
                          ? 'rgba(255,255,255,0.2)'
                          : 'rgba(0,0,0,0.2)',
                      }}
                    />
                  )}
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5 transition-colors',
                      viewMode === mode
                        ? isDark
                          ? 'text-white/70'
                          : 'text-black/70'
                        : isDark
                          ? 'text-white/35 group-hover:text-white/50'
                          : 'text-black/35 group-hover:text-black/50',
                    )}
                  />
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              className={cn(
                'group rounded-md border p-1.5 transition-all duration-200',
                isDark
                  ? 'border-white/[0.06] hover:border-white/15 hover:bg-white/[0.03]'
                  : 'border-black/[0.06] hover:border-black/15 hover:bg-black/[0.03]',
              )}
              title='Refresh'>
              <RiRefreshLine
                className={cn(
                  'h-3.5 w-3.5 transition-transform group-hover:rotate-180',
                  isDark
                    ? 'text-white/40 group-hover:text-white/60'
                    : 'text-black/40 group-hover:text-black/60',
                )}
              />
            </button>
          </div>
        </div>

        {/* Type filters */}
        {showFilters && (
          <div className='mt-2 flex gap-1.5 px-6'>
            {(['event', 'concept', 'pattern', 'context'] as ArtifactType[]).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[11px] font-medium transition-all',
                    selectedTypes.has(type)
                      ? isDark
                        ? 'border-white/20 bg-white/5'
                        : 'border-black/20 bg-black/5'
                      : isDark
                        ? 'border-white/10 hover:border-white/20'
                        : 'border-black/10 hover:border-black/20',
                  )}
                  style={{
                    borderLeftWidth: '2px',
                    borderLeftColor: selectedTypes.has(type)
                      ? {
                          event: '#00d4ff',
                          concept: '#a855f7',
                          pattern: '#52c41a',
                          context: '#faad14',
                        }[type]
                      : undefined,
                  }}>
                  <span className={isDark ? 'text-white/70' : 'text-black/70'}>
                    {typeLabels[type]}
                  </span>
                  <span
                    className={cn(
                      'ml-1',
                      isDark ? 'text-white/30' : 'text-black/30',
                    )}>
                    {graph.stats.artifactsByType[type]}
                  </span>
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className='flex-1 overflow-auto p-4'>
        {viewMode === 'graph' && (
          <div className='h-full'>
            <KnowledgeGraphCanvas
              graph={graph}
              onNodeClick={(artifact) => setSelectedArtifact(artifact)}
            />
          </div>
        )}

        {viewMode === 'stats' && (
          <div className='space-y-0'>
            {/* Main Stats - line based */}
            <div
              className={cn(
                'border-b px-6 py-4',
                isDark ? 'border-white/5' : 'border-black/5',
              )}>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-6'>
                  {[
                    {
                      label: 'Artifacts',
                      value: graph.stats.totalArtifacts,
                      color: '#52c41a',
                    },
                    {
                      label: 'Links',
                      value: graph.stats.totalLinks,
                      color: '#00d4ff',
                    },
                    {
                      label: 'Tags',
                      value: graph.stats.totalTags,
                      color: '#faad14',
                    },
                    {
                      label: 'Nodes',
                      value: graph.nodes.length,
                      color: '#a855f7',
                    },
                  ].map((stat, index) => (
                    <div key={stat.label} className='flex items-baseline gap-2'>
                      <span
                        className='text-[24px] font-bold tabular-nums'
                        style={{ color: stat.color }}>
                        {stat.value}
                      </span>
                      <span
                        className={cn(
                          'text-[12px]',
                          isDark ? 'text-white/40' : 'text-black/40',
                        )}>
                        {stat.label}
                      </span>
                      {index < 3 && <span className='ml-4 opacity-20'>|</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Type Distribution */}
            <div
              className={cn(
                'border-b px-6 py-4',
                isDark ? 'border-white/5' : 'border-black/5',
              )}>
              <h3
                className={cn(
                  'mb-3 text-[13px] font-medium',
                  isDark ? 'text-white/60' : 'text-black/60',
                )}>
                Distribution by Type
              </h3>
              <div className='space-y-2'>
                {Object.entries(typeColors).map(([type, color]) => {
                  const count =
                    graph.stats.artifactsByType[type as ArtifactType] || 0
                  const percentage =
                    graph.stats.totalArtifacts > 0
                      ? Math.round((count / graph.stats.totalArtifacts) * 100)
                      : 0

                  return (
                    <div
                      key={type}
                      className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <div
                          className='h-1 w-1 rounded-full'
                          style={{ backgroundColor: color }}
                        />
                        <span
                          className={cn(
                            'text-[13px]',
                            isDark ? 'text-white/70' : 'text-black/70',
                          )}>
                          {typeLabels[type as ArtifactType]}
                        </span>
                      </div>
                      <div className='flex items-center gap-3'>
                        <div className='w-32'>
                          <div
                            className={cn(
                              'h-1 overflow-hidden rounded-full',
                              isDark ? 'bg-white/10' : 'bg-black/10',
                            )}>
                            <div
                              className='h-full rounded-full'
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                        <span
                          className='text-[12px] font-semibold tabular-nums'
                          style={{ color }}>
                          {count}
                        </span>
                        <span
                          className={cn(
                            'text-[11px]',
                            isDark ? 'text-white/30' : 'text-black/30',
                          )}>
                          ({percentage}%)
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Most Connected Artifacts */}
            {graph.stats.mostConnected.length > 0 && (
              <div className='px-6 py-4'>
                <h3
                  className={cn(
                    'mb-3 text-[13px] font-medium',
                    isDark ? 'text-white/60' : 'text-black/60',
                  )}>
                  Most Connected
                </h3>
                <div className='space-y-2'>
                  {graph.stats.mostConnected.slice(0, 5).map((item, index) => (
                    <div
                      key={item.id}
                      className='flex items-center justify-between py-1'>
                      <div className='flex items-center gap-3'>
                        <span
                          className={cn(
                            'font-mono text-[11px]',
                            isDark ? 'text-white/30' : 'text-black/30',
                          )}>
                          {index + 1}.
                        </span>
                        <span
                          className={cn(
                            'text-[13px]',
                            isDark ? 'text-white/70' : 'text-black/70',
                          )}>
                          {item.title}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span
                          className='text-[12px] font-semibold'
                          style={{ color: '#00d4ff' }}>
                          {item.connections}
                        </span>
                        <span
                          className={cn(
                            'text-[11px]',
                            isDark ? 'text-white/30' : 'text-black/30',
                          )}>
                          connections
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'list' && (
          <div
            className={cn(
              'divide-y',
              isDark ? 'divide-white/5' : 'divide-black/5',
            )}>
            {filteredNodes.map((node, index) => {
              const artifact = graph.nodes.find((n) => n.id === node.id)
              if (!artifact) return null

              const displayArtifact: KnowledgeArtifact = {
                id: artifact.id,
                type: artifact.type,
                title: artifact.title,
                content: '',
                metadata: artifact.importance
                  ? { importance: artifact.importance }
                  : {},
                tags: artifact.tags,
                links: [],
                backlinks: [],
                filePath: artifact.filePath,
                createdAt: artifact.createdAt,
                updatedAt: artifact.createdAt,
              }

              return (
                <ArtifactCard
                  key={artifact.id}
                  artifact={displayArtifact}
                  onSelect={setSelectedArtifact}
                  compact
                  index={index}
                />
              )
            })}
          </div>
        )}

        {filteredNodes.length === 0 && (
          <div className='flex h-64 items-center justify-center'>
            <p
              className={cn(
                'text-sm',
                isDark ? 'text-zinc-500' : 'text-[#86868b]',
              )}>
              No artifacts found
            </p>
          </div>
        )}
      </div>

      {/* Artifact Viewer Modal */}
      {selectedArtifact && (
        <ArtifactViewer
          workspaceId={workspaceId}
          userId={userId}
          agentId={agentId}
          artifactId={selectedArtifact.id}
          onClose={() => setSelectedArtifact(null)}
        />
      )}
    </div>
  )
}
