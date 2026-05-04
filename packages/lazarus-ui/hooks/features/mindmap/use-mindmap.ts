import * as yaml from 'js-yaml'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  parseFlowDocument,
  updateNodePosition,
  type FlowNode,
  type ParsedFlowData,
} from '@/components/ui/flow'

import { useMindmapWorkflow } from './use-mindmap-workflow'

export interface MindmapNode {
  id: string
  title: string
  content?: string
  type: string
  style?: string
  position: any
  parent?: string
  children: string[]
}

export interface UseMindmapReturn {
  originalContent: string
  editedContent: string
  parsedData: ParsedFlowData | null
  nodes: MindmapNode[]
  showMarkdownEditor: boolean
  isEditing: boolean
  addNode: (parentId: string, title: string, type?: string) => void
  removeNode: (nodeId: string) => void
  updateNode: (nodeId: string, title: string, content?: string) => void
  updateNodePosition: (
    nodeId: string,
    position: { x: number; y: number },
  ) => void
  changeStyle: (
    nodeId: string,
    style:
      | 'primary'
      | 'secondary'
      | 'success'
      | 'warning'
      | 'danger'
      | 'subtle'
      | 'ghost',
  ) => void
  toggleMarkdownEditor: () => void
  updateMarkdown: (content: string) => void
  autoLayout: () => void
  exportAsImage: () => void
}

/**
 * Convert Flow nodes to our MindmapNode format for backward compatibility
 */
function convertFlowNodesToMindmapNodes(
  parsedData: ParsedFlowData,
): MindmapNode[] {
  const nodes: MindmapNode[] = []
  const nodeArray = Array.from(parsedData.nodes.values())

  nodeArray.forEach((node) => {
    // Find connections to determine children
    const children = parsedData.connections
      .filter((conn) => conn.from === node.id)
      .map((conn) => conn.to)

    // Find parent (first node that connects to this one)
    const parentConnection = parsedData.connections.find(
      (conn) => conn.to === node.id,
    )

    const mindmapNode: MindmapNode = {
      id: node.id,
      title: node.title,
      content: node.content,
      type: node.type,
      style: node.style,
      position: node.position,
      parent: parentConnection?.from,
      children,
    }

    nodes.push(mindmapNode)
  })

  return nodes
}

/**
 * Update Flow YAML content with new node data
 */
function updateFlowContent(
  content: string,
  updates: Partial<{ nodes: FlowNode[]; connections: any[] }>,
): string {
  try {
    const doc = yaml.load(content) as any

    if (updates.nodes) {
      doc.flow.nodes = updates.nodes
    }

    if (updates.connections) {
      doc.flow.connections = updates.connections
    }

    return yaml.dump(doc, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      quotingType: '"',
      forceQuotes: false,
    })
  } catch (error) {
    console.error('Error updating Flow content:', error)
    return content
  }
}

/**
 * Hook for managing mindmap editing and visualization using Flow
 * Provides functionality for node manipulation, styling, and export
 */
export function useMindmap(): UseMindmapReturn {
  const mindmapWorkflow = useMindmapWorkflow()
  const [parsedData, setParsedData] = useState<ParsedFlowData | null>(null)
  const [nodes, setNodes] = useState<MindmapNode[]>([])

  // Parse Flow content
  const parseContent = useCallback((content: string) => {
    try {
      const parsed = parseFlowDocument(content)
      setParsedData(parsed)
      return parsed
    } catch (error) {
      console.error('Error parsing Flow content:', error)
      setParsedData(null)
      return null
    }
  }, [])

  // Parse nodes from content
  const parsedNodes = useMemo(() => {
    if (!parsedData) return []
    return convertFlowNodesToMindmapNodes(parsedData)
  }, [parsedData])

  // Update local nodes when parsed data changes
  useEffect(() => {
    setNodes(parsedNodes)
  }, [parsedNodes])

  // Parse content when it changes
  useEffect(() => {
    if (mindmapWorkflow.state.editedContent) {
      parseContent(mindmapWorkflow.state.editedContent)
    }
  }, [mindmapWorkflow.state.editedContent, parseContent])

  // Add a new node
  const addNode = useCallback(
    (parentId: string, title: string, type: string = 'concept') => {
      if (!parsedData) return

      const newNodeId = `node_${Date.now()}`
      const parentNode = parsedData.nodes.get(parentId)

      if (!parentNode) return

      // Create new node
      const newNode: FlowNode = {
        id: newNodeId,
        type: type as any,
        title,
        content: '',
        position: {
          relative: parentId,
          direction: 'south',
          distance: 'medium',
        },
        style: 'secondary',
      }

      // Update nodes array
      const currentNodes = Array.from(parsedData.nodes.values())
      const updatedNodes = [...currentNodes, newNode]

      // Update connections
      const newConnection = {
        from: parentId,
        to: newNodeId,
        type: 'flow',
      }
      const updatedConnections = [...parsedData.connections, newConnection]

      // Update the content
      const updatedContent = updateFlowContent(
        mindmapWorkflow.state.editedContent,
        {
          nodes: updatedNodes,
          connections: updatedConnections,
        },
      )

      mindmapWorkflow.updateMindmapContent(updatedContent)
    },
    [parsedData, mindmapWorkflow],
  )

  // Remove a node
  const removeNode = useCallback(
    (nodeId: string) => {
      if (!parsedData) return

      // Remove node and its connections
      const updatedNodes = Array.from(parsedData.nodes.values()).filter(
        (n) => n.id !== nodeId,
      )
      const updatedConnections = parsedData.connections.filter(
        (c) => c.from !== nodeId && c.to !== nodeId,
      )

      // Update the content
      const updatedContent = updateFlowContent(
        mindmapWorkflow.state.editedContent,
        {
          nodes: updatedNodes,
          connections: updatedConnections,
        },
      )

      mindmapWorkflow.updateMindmapContent(updatedContent)
    },
    [parsedData, mindmapWorkflow],
  )

  // Update a node's title and content
  const updateNode = useCallback(
    (nodeId: string, title: string, content?: string) => {
      if (!parsedData) return

      const updatedNodes = Array.from(parsedData.nodes.values()).map((node) =>
        node.id === nodeId
          ? { ...node, title, content: content || node.content }
          : node,
      )

      // Update the content
      const updatedContent = updateFlowContent(
        mindmapWorkflow.state.editedContent,
        {
          nodes: updatedNodes,
        },
      )

      mindmapWorkflow.updateMindmapContent(updatedContent)
    },
    [parsedData, mindmapWorkflow],
  )

  // Update node position
  const updateNodePositionHandler = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      try {
        const updatedContent = updateNodePosition(
          mindmapWorkflow.state.editedContent,
          nodeId,
          position,
        )
        mindmapWorkflow.updateMindmapContent(updatedContent)
      } catch (error) {
        console.error('Error updating node position:', error)
      }
    },
    [mindmapWorkflow],
  )

  // Change node style
  const changeStyle = useCallback(
    (
      nodeId: string,
      style:
        | 'primary'
        | 'secondary'
        | 'success'
        | 'warning'
        | 'danger'
        | 'subtle'
        | 'ghost',
    ) => {
      if (!parsedData) return

      const updatedNodes = Array.from(parsedData.nodes.values()).map((node) =>
        node.id === nodeId ? { ...node, style } : node,
      )

      // Update the content
      const updatedContent = updateFlowContent(
        mindmapWorkflow.state.editedContent,
        {
          nodes: updatedNodes,
        },
      )

      mindmapWorkflow.updateMindmapContent(updatedContent)
    },
    [parsedData, mindmapWorkflow],
  )

  // Toggle markdown editor
  const toggleMarkdownEditor = useCallback(() => {
    mindmapWorkflow.toggleMarkdownEditor()
  }, [mindmapWorkflow])

  // Update markdown content directly
  const updateMarkdown = useCallback(
    (content: string) => {
      mindmapWorkflow.updateMindmapContent(content)
    },
    [mindmapWorkflow],
  )

  // Auto-layout the mindmap
  const autoLayout = useCallback(() => {
    mindmapWorkflow.autoLayout()
  }, [mindmapWorkflow])

  // Export as image
  const exportAsImage = useCallback(() => {
    // This would trigger an export process using Flow's export capabilities
    console.log('Exporting Flow mindmap as image...')
    // In production, this would use Flow's built-in export functionality
  }, [])

  return {
    originalContent: mindmapWorkflow.state.originalContent,
    editedContent: mindmapWorkflow.state.editedContent,
    parsedData,
    nodes,
    showMarkdownEditor: mindmapWorkflow.state.showMarkdownEditor,
    isEditing: mindmapWorkflow.state.isEditing,
    addNode,
    removeNode,
    updateNode,
    updateNodePosition: updateNodePositionHandler,
    changeStyle,
    toggleMarkdownEditor,
    updateMarkdown,
    autoLayout,
    exportAsImage,
  }
}
