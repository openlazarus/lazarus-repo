'use client'

import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  ConnectionLineType,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  Position,
  useEdgesState,
  useNodesState,
} from 'reactflow'

import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import {
  ArtifactType,
  KnowledgeArtifact,
  KnowledgeGraph,
} from '@/model/knowledge'
import 'reactflow/dist/style.css'

interface KnowledgeGraphCanvasProps {
  graph: KnowledgeGraph
  onNodeClick?: (artifact: KnowledgeArtifact) => void
}

// Refined color scheme for artifact types
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

// Improved force-directed layout algorithm
function calculateForceLayout(nodes: any[], edges: any[], iterations = 100) {
  const positions = new Map<string, { x: number; y: number }>()

  // Initialize positions randomly with some spread
  nodes.forEach((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI + (Math.random() - 0.5) * 0.5
    const radius = 200 + Math.random() * 100
    positions.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    })
  })

  // Force-directed layout iterations
  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number }>()

    // Initialize forces
    nodes.forEach((node) => forces.set(node.id, { x: 0, y: 0 }))

    // Cooling factor - reduce movement over time
    const cooling = 1 - iter / iterations

    // Repulsion between all nodes (stronger)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i]
        const node2 = nodes[j]
        const pos1 = positions.get(node1.id)!
        const pos2 = positions.get(node2.id)!

        const dx = pos2.x - pos1.x
        const dy = pos2.y - pos1.y
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1)

        // Stronger repulsion force
        const force = 15000 / (distance * distance)

        const fx = (dx / distance) * force
        const fy = (dy / distance) * force

        const f1 = forces.get(node1.id)!
        const f2 = forces.get(node2.id)!
        f1.x -= fx
        f1.y -= fy
        f2.x += fx
        f2.y += fy
      }
    }

    // Attraction along edges
    edges.forEach((edge) => {
      const pos1 = positions.get(edge.source)
      const pos2 = positions.get(edge.target)

      if (!pos1 || !pos2) return

      const dx = pos2.x - pos1.x
      const dy = pos2.y - pos1.y
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1)

      // Spring force - pull connected nodes together
      const idealDistance = 150
      const force = (distance - idealDistance) * 0.05

      const fx = (dx / distance) * force
      const fy = (dy / distance) * force

      const f1 = forces.get(edge.source)!
      const f2 = forces.get(edge.target)!
      f1.x += fx
      f1.y += fy
      f2.x -= fx
      f2.y -= fy
    })

    // Apply forces with cooling
    nodes.forEach((node) => {
      const pos = positions.get(node.id)!
      const force = forces.get(node.id)!
      const damping = 0.5 * cooling
      pos.x += force.x * damping
      pos.y += force.y * damping
    })
  }

  return positions
}

export function KnowledgeGraphCanvas({
  graph,
  onNodeClick,
}: KnowledgeGraphCanvasProps) {
  const { isDark } = useTheme()
  // Convert graph data to React Flow format
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    // Calculate better layout using force-directed algorithm
    const nodeData = graph.nodes.map((node) => ({ id: node.id }))
    const edgeData = graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
    }))
    const positions = calculateForceLayout(nodeData, edgeData)

    // Create nodes from graph nodes
    const nodes: Node[] = graph.nodes.map((node) => {
      const color = typeColors[node.type]
      const pos = positions.get(node.id)!

      return {
        id: node.id,
        type: 'default',
        data: {
          label: (
            <div className='text-left'>
              {/* Type indicator - compact pill */}
              <div className='mb-2 flex items-center gap-2'>
                <div
                  className='rounded-full px-2.5 py-0.5'
                  style={{
                    backgroundColor: isDark ? `${color}15` : `${color}12`,
                  }}>
                  <span
                    className='text-[10px] font-semibold tracking-wide'
                    style={{ color }}>
                    {typeLabels[node.type]}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div
                className={cn(
                  'mb-2 text-[13px] font-semibold leading-[1.3] tracking-[-0.01em]',
                  isDark ? 'text-white' : 'text-black',
                )}>
                {node.title}
              </div>

              {/* Tags */}
              {node.tags && node.tags.length > 0 && (
                <div className='flex flex-wrap gap-1.5'>
                  {node.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className='text-[11px] font-medium'
                      style={{
                        color: isDark
                          ? 'rgba(255,255,255,0.35)'
                          : 'rgba(0,0,0,0.35)',
                      }}>
                      {tag}
                    </span>
                  ))}
                  {node.tags.length > 2 && (
                    <span className='text-[11px]' style={{ opacity: 0.3 }}>
                      +{node.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          ),
          artifact: node,
        },
        position: pos,
        style: {
          background: isDark
            ? 'linear-gradient(135deg, rgba(35, 35, 38, 0.95), rgba(45, 45, 48, 0.9))'
            : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(250,250,252,0.9))',
          border: isDark
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(0,0,0,0.06)',
          borderRadius: '12px',
          padding: '14px 16px',
          width: 220,
          color: isDark ? '#ffffff' : '#000000',
          backdropFilter: 'blur(20px)',
          boxShadow: isDark
            ? '0 4px 12px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)'
            : '0 4px 12px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }
    })

    // Create edges with improved styling
    const edges: Edge[] = graph.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: false,
      style: {
        stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        strokeWidth: 1.5,
        strokeDasharray: '5 5',
      },
      markerEnd: {
        type: MarkerType.Arrow,
        color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
        width: 8,
        height: 8,
      },
    }))

    return { nodes, edges }
  }, [graph, isDark])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onNodeClickHandler = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const artifact = node.data.artifact
      if (onNodeClick && artifact) {
        onNodeClick(artifact)
      }
    },
    [onNodeClick],
  )

  return (
    <div
      className={
        isDark
          ? 'relative h-full w-full bg-[#1a1a1a]'
          : 'relative h-full w-full bg-white'
      }>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        attributionPosition='bottom-left'
        className={isDark ? 'bg-[#1a1a1a]' : 'bg-white'}
        minZoom={0.1}
        maxZoom={1.5}>
        <Background
          color={isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
          gap={16}
          size={0.5}
        />
        <Controls
          className={
            isDark
              ? 'rounded-lg border border-zinc-800 bg-[#111111]'
              : 'rounded-lg border border-[#e5e5e7] bg-white'
          }
        />
        <MiniMap
          className={
            isDark
              ? 'rounded-lg border border-zinc-800 bg-[#111111]'
              : 'rounded-lg border border-[#e5e5e7] bg-white'
          }
          nodeColor={(node) => {
            const type = node.data.artifact?.type as ArtifactType
            return typeColors[type] || (isDark ? '#52525b' : '#d4d4d8')
          }}
          maskColor={isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
        />

        {/* Minimalistic Legend */}
        <div
          className={cn(
            'pointer-events-auto absolute left-6 top-6 overflow-hidden rounded-md border backdrop-blur-2xl',
            isDark
              ? 'border-white/[0.08] bg-[#1a1a1a]/80'
              : 'border-black/[0.08] bg-white/80',
          )}
          style={{ zIndex: 999 }}>
          <div className='p-1'>
            {Object.entries(typeColors).map(([type, color]) => (
              <div
                key={type}
                className={cn(
                  'group relative flex items-center gap-2 rounded px-2.5 py-1.5 transition-all duration-200',
                  isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.02]',
                )}>
                <div
                  className='h-1 w-1 rounded-full'
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 4px ${color}40`,
                  }}
                />
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    isDark ? 'text-white/60' : 'text-black/60',
                  )}>
                  {typeLabels[type as ArtifactType]}
                </span>
                <span
                  className='ml-auto text-[10px] font-bold tabular-nums'
                  style={{ color, opacity: 0.8 }}>
                  {graph.stats.artifactsByType[type as ArtifactType] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ReactFlow>
    </div>
  )
}
