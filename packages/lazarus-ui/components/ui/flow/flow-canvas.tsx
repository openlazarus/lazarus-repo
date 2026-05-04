'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { NodeStyle, ParsedFlowData } from './types'

interface FlowCanvasProps {
  data: ParsedFlowData
  onNodeUpdate?: (nodeId: string, position: { x: number; y: number }) => void
}

interface DragState {
  nodeId: string | null
  startX: number
  startY: number
  currentX: number
  currentY: number
}

interface PanState {
  isPanning: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
  velocityX: number
  velocityY: number
}

export function FlowCanvas({ data, onNodeUpdate }: FlowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragState, setDragState] = useState<DragState>({
    nodeId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  })
  const [panState, setPanState] = useState<PanState>({
    isPanning: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    velocityX: 0,
    velocityY: 0,
  })
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [nodePositions, setNodePositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map())

  // Initialize node positions
  useEffect(() => {
    const positions = new Map<string, { x: number; y: number }>()
    data.nodes.forEach((node) => {
      positions.set(node.id, { ...node.computedPosition })
    })
    setNodePositions(positions)
  }, [data.nodes])

  // Node style mapping with enhanced shadows
  const getNodeStyles = (
    style?: NodeStyle,
    isSelected?: boolean,
    isDragging?: boolean,
  ) => {
    const styles = {
      primary: 'bg-blue-500 text-white border-blue-600',
      secondary: 'bg-gray-500 text-white border-gray-600',
      success: 'bg-green-500 text-white border-green-600',
      warning: 'bg-yellow-500 text-white border-yellow-600',
      danger: 'bg-red-500 text-white border-red-600',
      subtle: 'bg-gray-100 text-gray-700 border-gray-300',
      ghost: 'bg-transparent text-gray-700 border-gray-300',
    }
    const baseStyle = styles[style || 'subtle']
    const shadowStyle = isDragging
      ? 'shadow-2xl'
      : isSelected
        ? 'shadow-lg'
        : 'shadow-md hover:shadow-lg'
    const ringStyle = isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''

    return `${baseStyle} ${shadowStyle} ${ringStyle}`
  }

  // Node type icons
  const getNodeIcon = (type: string) => {
    const icons = {
      concept: 'C',
      action: 'A',
      decision: 'D',
      note: 'N',
      group: 'G',
    }
    return icons[type as keyof typeof icons] || 'F'
  }

  // Calculate smooth bezier curve connection path
  const getConnectionPath = (fromId: string, toId: string) => {
    const fromPos =
      nodePositions.get(fromId) || data.nodes.get(fromId)?.computedPosition
    const toPos =
      nodePositions.get(toId) || data.nodes.get(toId)?.computedPosition

    if (!fromPos || !toPos) return ''

    const fromX = fromPos.x + 100
    const fromY = fromPos.y + 40
    const toX = toPos.x + 100
    const toY = toPos.y + 40

    const dx = toX - fromX
    const dy = toY - fromY
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Smooth control points for natural curves
    const tension = Math.min(distance * 0.5, 200)
    const cp1x = fromX + tension
    const cp1y = fromY
    const cp2x = toX - tension
    const cp2y = toY

    return `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`
  }

  // Handle node drag start
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    e.stopPropagation()

    const pos =
      nodePositions.get(nodeId) || data.nodes.get(nodeId)?.computedPosition
    if (!pos) return

    setDragState({
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: pos.x,
      currentY: pos.y,
    })
    setSelectedNode(nodeId)
  }

  // Handle canvas pan start
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).classList.contains('canvas-background')
    ) {
      e.preventDefault()
      setPanState({
        isPanning: true,
        startX: e.clientX,
        startY: e.clientY,
        currentX: pan.x,
        currentY: pan.y,
        velocityX: 0,
        velocityY: 0,
      })
      setSelectedNode(null)
    }
  }

  // Smooth animation loop
  const animate = useCallback(
    (timestamp: number) => {
      const _deltaTime = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      // Apply momentum to panning
      if (
        !panState.isPanning &&
        (Math.abs(panState.velocityX) > 0.1 ||
          Math.abs(panState.velocityY) > 0.1)
      ) {
        const friction = 0.95
        setPan((prev) => ({
          x: prev.x + panState.velocityX,
          y: prev.y + panState.velocityY,
        }))
        setPanState((prev) => ({
          ...prev,
          velocityX: prev.velocityX * friction,
          velocityY: prev.velocityY * friction,
        }))
      }

      animationRef.current = requestAnimationFrame(animate)
    },
    [panState.isPanning, panState.velocityX, panState.velocityY],
  )

  // Start animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate])

  // Handle mouse move with smooth updates
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragState.nodeId) {
        const dx = (e.clientX - dragState.startX) / zoom
        const dy = (e.clientY - dragState.startY) / zoom

        const newX = dragState.currentX + dx
        const newY = dragState.currentY + dy

        // Update position immediately for smooth feedback
        setNodePositions((prev) => {
          const newPositions = new Map(prev)
          newPositions.set(dragState.nodeId!, { x: newX, y: newY })
          return newPositions
        })

        // Debounce the actual update callback
        if (onNodeUpdate) {
          const timeoutId = setTimeout(() => {
            onNodeUpdate(dragState.nodeId!, { x: newX, y: newY })
          }, 16) // ~60fps
          return () => clearTimeout(timeoutId)
        }
      } else if (panState.isPanning) {
        const dx = e.clientX - panState.startX
        const dy = e.clientY - panState.startY

        setPan({
          x: panState.currentX + dx,
          y: panState.currentY + dy,
        })

        // Calculate velocity for momentum
        setPanState((prev) => ({
          ...prev,
          velocityX: dx * 0.1,
          velocityY: dy * 0.1,
        }))
      }
    },
    [dragState, panState, zoom, onNodeUpdate],
  )

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDragState({
      nodeId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    })
    setPanState((prev) => ({ ...prev, isPanning: false }))
  }, [])

  // Smooth zoom with mouse wheel
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY * -0.001
        const newZoom = Math.max(0.25, Math.min(3, zoom + delta))

        // Zoom towards mouse position
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const zoomDiff = newZoom - zoom

          setPan((prev) => ({
            x: prev.x - (x - rect.width / 2) * zoomDiff,
            y: prev.y - (y - rect.height / 2) * zoomDiff,
          }))
        }

        setZoom(newZoom)
      }
    },
    [zoom],
  )

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedNode(null)
    } else if ((e.key === '=' || e.key === '+') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      setZoom((prev) => Math.min(3, prev + 0.1))
    } else if (e.key === '-' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      setZoom((prev) => Math.max(0.25, prev - 0.1))
    } else if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
  }, [])

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('keydown', handleKeyDown)
    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false })
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('keydown', handleKeyDown)
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel)
      }
    }
  }, [handleMouseMove, handleMouseUp, handleKeyDown, handleWheel])

  return (
    <div
      ref={canvasRef}
      className='relative h-full w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100'>
      {/* Controls with glassmorphism */}
      <div className='absolute right-4 top-4 z-10 flex items-center space-x-2 rounded-xl border border-gray-200/50 bg-white/80 p-2 shadow-lg backdrop-blur-md'>
        <button
          onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}
          className='rounded-lg p-2 transition-all duration-200 hover:bg-gray-100/80 active:scale-95'
          title='Zoom out (⌘ -)'>
          <svg
            className='h-4 w-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M20 12H4'
            />
          </svg>
        </button>
        <span className='min-w-[3rem] text-center text-sm font-medium text-gray-600'>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(Math.min(3, zoom + 0.1))}
          className='rounded-lg p-2 transition-all duration-200 hover:bg-gray-100/80 active:scale-95'
          title='Zoom in (⌘ +)'>
          <svg
            className='h-4 w-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 4v16m8-8H4'
            />
          </svg>
        </button>
        <div className='h-6 w-px bg-gray-300/50' />
        <button
          onClick={() => {
            setZoom(1)
            setPan({ x: 0, y: 0 })
          }}
          className='rounded-lg p-2 transition-all duration-200 hover:bg-gray-100/80 active:scale-95'
          title='Reset view (⌘ 0)'>
          <svg
            className='h-4 w-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
            />
          </svg>
        </button>
      </div>

      {/* Instructions with glassmorphism */}
      <div className='absolute bottom-4 left-4 z-10 max-w-xs rounded-xl border border-gray-200/50 bg-white/80 p-4 text-xs text-gray-600 shadow-lg backdrop-blur-md'>
        <div className='mb-2 font-semibold text-gray-800'>Controls</div>
        <div className='space-y-1'>
          <div className='flex items-center space-x-2'>
            <span className='text-gray-400'>•</span>
            <span>Drag nodes to reposition</span>
          </div>
          <div className='flex items-center space-x-2'>
            <span className='text-gray-400'>•</span>
            <span>Drag background to pan</span>
          </div>
          <div className='flex items-center space-x-2'>
            <span className='text-gray-400'>•</span>
            <span>⌘/Ctrl + scroll to zoom</span>
          </div>
          <div className='flex items-center space-x-2'>
            <span className='text-gray-400'>•</span>
            <span>⌘/Ctrl + 0 to reset</span>
          </div>
        </div>
      </div>

      {/* Canvas with smooth transforms */}
      <div
        className={`absolute inset-0 ${panState.isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleCanvasMouseDown}
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}>
        {/* Background pattern */}
        <div
          className='canvas-background absolute inset-0'
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(209 213 219 / 0.3) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* Containers - render BEFORE connections so they appear behind */}
        {data.containers.map((container) => {
          const containedNodes = container.contains
            .map((id) => ({
              id,
              pos:
                nodePositions.get(id) || data.nodes.get(id)?.computedPosition,
            }))
            .filter((n) => n.pos) as {
            id: string
            pos: { x: number; y: number }
          }[]

          if (containedNodes.length === 0) return null

          const minX = Math.min(...containedNodes.map((n) => n.pos.x)) - 30
          const minY = Math.min(...containedNodes.map((n) => n.pos.y)) - 50
          const maxX = Math.max(...containedNodes.map((n) => n.pos.x)) + 230
          const maxY = Math.max(...containedNodes.map((n) => n.pos.y)) + 110

          return (
            <div
              key={container.id}
              className={`pointer-events-none absolute rounded-2xl border-2 transition-all duration-300 ${
                container.style === 'emphasized'
                  ? 'border-gray-400/50 bg-gray-100/30'
                  : 'border-gray-300/30 bg-gray-50/20'
              }`}
              style={{
                left: minX,
                top: minY,
                width: maxX - minX,
                height: maxY - minY,
                backdropFilter: 'blur(8px)',
                zIndex: 1, // Ensure containers are behind connections
              }}>
              <div className='absolute -top-3 left-6 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-600 shadow-sm'>
                {container.title}
              </div>
            </div>
          )
        })}

        {/* Connections with real-time updates - render AFTER containers */}
        <svg
          className='pointer-events-none absolute inset-0'
          style={{ width: '200%', height: '200%', zIndex: 2 }}>
          <defs>
            <marker
              id='arrowhead'
              markerWidth='10'
              markerHeight='10'
              refX='9'
              refY='3'
              orient='auto'>
              <polygon points='0 0, 10 3, 0 6' fill='#6B7280' />
            </marker>
            <filter id='shadow' x='-50%' y='-50%' width='200%' height='200%'>
              <feGaussianBlur in='SourceAlpha' stdDeviation='2' />
              <feOffset dx='0' dy='1' result='offsetblur' />
              <feFlood floodColor='#000000' floodOpacity='0.1' />
              <feComposite in2='offsetblur' operator='in' />
              <feMerge>
                <feMergeNode />
                <feMergeNode in='SourceGraphic' />
              </feMerge>
            </filter>
          </defs>
          {data.connections.map((connection) => {
            const path = getConnectionPath(connection.from, connection.to)
            if (!path) return null

            return (
              <g key={connection.id}>
                <path
                  d={path}
                  fill='none'
                  stroke='#9CA3AF'
                  strokeWidth='2'
                  strokeDasharray={
                    connection.style === 'dashed'
                      ? '5,5'
                      : connection.style === 'dotted'
                        ? '2,2'
                        : undefined
                  }
                  markerEnd='url(#arrowhead)'
                  filter='url(#shadow)'
                />
                {connection.label && (
                  <text
                    x={
                      (nodePositions.get(connection.from)?.x || 0) +
                      (nodePositions.get(connection.to)?.x || 0) / 2 +
                      100
                    }
                    y={
                      (nodePositions.get(connection.from)?.y || 0) +
                      (nodePositions.get(connection.to)?.y || 0) / 2 +
                      40
                    }
                    textAnchor='middle'
                    className='fill-gray-600 text-xs font-medium'
                    style={{ userSelect: 'none' }}>
                    {connection.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Nodes with enhanced styling - highest z-index */}
        {Array.from(data.nodes.values()).map((node) => {
          const pos = nodePositions.get(node.id) || node.computedPosition
          const isDragging = dragState.nodeId === node.id

          return (
            <div
              key={node.id}
              className={`absolute min-h-[80px] w-[200px] rounded-xl border-2 p-4 transition-all duration-200 ${
                isDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab hover:scale-[1.02]'
              } ${getNodeStyles(node.style, selectedNode === node.id, isDragging)}`}
              style={{
                left: pos.x,
                top: pos.y,
                transform: isDragging ? 'scale(1.05)' : 'scale(1)',
                willChange: 'transform',
                zIndex: isDragging ? 20 : 10, // Nodes always on top
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}>
              <div className='pointer-events-none flex select-none items-start space-x-3'>
                <span className='text-2xl drop-shadow-sm filter'>
                  {getNodeIcon(node.type)}
                </span>
                <div className='flex-1'>
                  <h3 className='text-sm font-semibold leading-tight'>
                    {node.title}
                  </h3>
                  {node.content && (
                    <p className='mt-1.5 whitespace-pre-line text-xs leading-relaxed opacity-90'>
                      {node.content}
                    </p>
                  )}
                  {node.properties && (
                    <div className='mt-2.5 flex flex-wrap gap-1.5'>
                      {node.properties.status && (
                        <span className='rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm'>
                          {node.properties.status}
                        </span>
                      )}
                      {node.properties.priority && (
                        <span className='rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur-sm'>
                          {node.properties.priority}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Annotations with glassmorphism */}
        {data.annotations.map((annotation, index) => {
          const targetPos =
            nodePositions.get(annotation.target) ||
            data.nodes.get(annotation.target)?.computedPosition
          if (!targetPos) return null

          return (
            <div
              key={annotation.id || index}
              className='pointer-events-none absolute max-w-[200px] rounded-xl border border-yellow-200/50 bg-yellow-50/90 p-3 shadow-lg backdrop-blur-sm'
              style={{
                left: targetPos.x + 220,
                top: targetPos.y,
              }}>
              <p className='text-xs leading-relaxed text-gray-700'>
                {annotation.content}
              </p>
              {annotation.author && (
                <p className='mt-2 text-xs font-medium text-gray-500'>
                  — {annotation.author}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
