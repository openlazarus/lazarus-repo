import * as yaml from 'js-yaml'

import {
  FlowDocument,
  FlowNode,
  ParsedConnection,
  ParsedFlowData,
  ParsedNode,
  Position,
  RelativePosition,
} from '../types'

// Default values
const DEFAULT_CANVAS = {
  layout: 'auto' as const,
  theme: 'light' as const,
  spacing: 'comfortable' as const,
}

const DEFAULT_META = {
  title: 'Untitled Flow',
  description: '',
  author: '',
  version: '1.0',
  tags: [],
}

// Parse YAML document into Flow data structure
export function parseFlowDocument(yamlContent: string): ParsedFlowData {
  try {
    const doc = yaml.load(yamlContent) as FlowDocument

    if (!doc.flow) {
      throw new Error('Invalid Flow document: missing "flow" root element')
    }

    const { flow } = doc

    // Parse nodes
    const nodes = new Map<string, ParsedNode>()
    const nodeConnections = new Map<string, string[]>()

    if (flow.nodes) {
      flow.nodes.forEach((node) => {
        const parsedNode: ParsedNode = {
          ...node,
          computedPosition: computeNodePosition(node, nodes),
          connections: [],
        }
        nodes.set(node.id, parsedNode)
      })
    }

    // Parse connections
    const connections: ParsedConnection[] = []
    if (flow.connections) {
      flow.connections.forEach((conn, index) => {
        const targets = Array.isArray(conn.to) ? conn.to : [conn.to]
        targets.forEach((target) => {
          const parsedConnection: ParsedConnection = {
            id: `conn-${index}-${target}`,
            from: conn.from,
            to: target,
            type: conn.type || 'flow',
            style: conn.style || 'solid',
            label: conn.label,
            bidirectional: conn.bidirectional || false,
          }
          connections.push(parsedConnection)

          // Update node connections
          const fromConnections = nodeConnections.get(conn.from) || []
          fromConnections.push(target)
          nodeConnections.set(conn.from, fromConnections)

          if (conn.bidirectional) {
            const toConnections = nodeConnections.get(target) || []
            toConnections.push(conn.from)
            nodeConnections.set(target, toConnections)
          }
        })
      })
    }

    // Apply connections to nodes
    nodeConnections.forEach((connections, nodeId) => {
      const node = nodes.get(nodeId)
      if (node) {
        node.connections = connections
      }
    })

    // Compute final positions after all nodes are parsed
    computeAllNodePositions(nodes)

    return {
      meta: { ...DEFAULT_META, ...flow.meta },
      canvas: { ...DEFAULT_CANVAS, ...flow.canvas },
      nodes,
      connections,
      containers: flow.containers || [],
      layers: flow.layers || [],
      annotations: flow.annotations || [],
    }
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      throw new Error(`YAML parsing error: ${error.message}`)
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown parsing error')
  }
}

// Compute position for a single node
function computeNodePosition(
  node: FlowNode,
  existingNodes: Map<string, ParsedNode>,
): Position {
  if (node.position === 'auto') {
    // Will be computed by layout engine
    return { x: 0, y: 0 }
  }

  if (node.position === 'center') {
    return { x: 400, y: 300 }
  }

  if (Array.isArray(node.position)) {
    return { x: node.position[0], y: node.position[1] }
  }

  if (typeof node.position === 'object' && 'x' in node.position) {
    return node.position as Position
  }

  if (typeof node.position === 'object' && 'relative' in node.position) {
    const relPos = node.position as RelativePosition
    const relativeNode = existingNodes.get(relPos.relative)
    if (relativeNode) {
      return computeRelativePosition(relativeNode.computedPosition, relPos)
    }
  }

  // Default position
  return { x: 200 + Math.random() * 400, y: 200 + Math.random() * 200 }
}

// Compute relative position based on direction and distance
function computeRelativePosition(
  basePos: Position,
  relPos: RelativePosition,
): Position {
  const distances = {
    near: 150,
    medium: 250,
    far: 400,
  }

  const distance = distances[relPos.distance || 'medium']

  const directions: Record<Direction, [number, number]> = {
    north: [0, -1],
    south: [0, 1],
    east: [1, 0],
    west: [-1, 0],
    northeast: [0.707, -0.707],
    southeast: [0.707, 0.707],
    northwest: [-0.707, -0.707],
    southwest: [-0.707, 0.707],
  }

  const [dx, dy] = directions[relPos.direction]

  return {
    x: basePos.x + dx * distance,
    y: basePos.y + dy * distance,
  }
}

type Direction =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'northeast'
  | 'southeast'
  | 'northwest'
  | 'southwest'

// Compute all node positions using layout algorithm
function computeAllNodePositions(nodes: Map<string, ParsedNode>) {
  // Simple force-directed layout for auto-positioned nodes
  const autoNodes = Array.from(nodes.values()).filter(
    (node) => node.position === 'auto' || node.computedPosition.x === 0,
  )

  if (autoNodes.length === 0) return

  // Initialize positions in a circle
  const centerX = 400
  const centerY = 300
  const radius = 200

  autoNodes.forEach((node, index) => {
    const angle = (index / autoNodes.length) * 2 * Math.PI
    node.computedPosition = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    }
  })

  // Apply force-directed algorithm
  const iterations = 50
  const repulsionStrength = 5000
  const attractionStrength = 0.01
  const damping = 0.9

  for (let i = 0; i < iterations; i++) {
    const forces = new Map<string, { x: number; y: number }>()

    // Initialize forces
    autoNodes.forEach((node) => {
      forces.set(node.id, { x: 0, y: 0 })
    })

    // Repulsion between all nodes
    for (let j = 0; j < autoNodes.length; j++) {
      for (let k = j + 1; k < autoNodes.length; k++) {
        const nodeA = autoNodes[j]
        const nodeB = autoNodes[k]

        const dx = nodeB.computedPosition.x - nodeA.computedPosition.x
        const dy = nodeB.computedPosition.y - nodeA.computedPosition.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const force = repulsionStrength / (distance * distance)
        const fx = (dx / distance) * force
        const fy = (dy / distance) * force

        const forceA = forces.get(nodeA.id)!
        const forceB = forces.get(nodeB.id)!

        forceA.x -= fx
        forceA.y -= fy
        forceB.x += fx
        forceB.y += fy
      }
    }

    // Attraction along connections
    autoNodes.forEach((node) => {
      node.connections.forEach((targetId) => {
        const target = nodes.get(targetId)
        if (target && autoNodes.includes(target)) {
          const dx = target.computedPosition.x - node.computedPosition.x
          const dy = target.computedPosition.y - node.computedPosition.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1

          const force = attractionStrength * distance
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force

          const nodeForce = forces.get(node.id)!
          nodeForce.x += fx
          nodeForce.y += fy
        }
      })
    })

    // Apply forces
    autoNodes.forEach((node) => {
      const force = forces.get(node.id)!
      node.computedPosition.x += force.x * damping
      node.computedPosition.y += force.y * damping

      // Keep nodes within bounds
      node.computedPosition.x = Math.max(
        50,
        Math.min(750, node.computedPosition.x),
      )
      node.computedPosition.y = Math.max(
        50,
        Math.min(550, node.computedPosition.y),
      )
    })
  }
}
