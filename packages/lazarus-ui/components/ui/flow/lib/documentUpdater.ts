import * as yaml from 'js-yaml'

import { FlowDocument } from '../types'

export function updateNodePosition(
  yamlContent: string,
  nodeId: string,
  position: { x: number; y: number },
): string {
  try {
    // Parse the YAML document
    const doc = yaml.load(yamlContent) as FlowDocument

    if (!doc.flow || !doc.flow.nodes) {
      throw new Error('Invalid Flow document structure')
    }

    // Find and update the node
    const nodeIndex = doc.flow.nodes.findIndex((node) => node.id === nodeId)
    if (nodeIndex === -1) {
      throw new Error(`Node with id "${nodeId}" not found`)
    }

    // Update the position
    doc.flow.nodes[nodeIndex].position = {
      x: Math.round(position.x),
      y: Math.round(position.y),
    }

    // Convert back to YAML
    return yaml.dump(doc, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      quotingType: '"',
      forceQuotes: false,
    })
  } catch (error) {
    console.error('Error updating node position:', error)
    throw error
  }
}

export function updateNodeProperty(
  yamlContent: string,
  nodeId: string,
  property: string,
  value: any,
): string {
  try {
    const doc = yaml.load(yamlContent) as FlowDocument

    if (!doc.flow || !doc.flow.nodes) {
      throw new Error('Invalid Flow document structure')
    }

    const nodeIndex = doc.flow.nodes.findIndex((node) => node.id === nodeId)
    if (nodeIndex === -1) {
      throw new Error(`Node with id "${nodeId}" not found`)
    }

    // Update the property
    ;(doc.flow.nodes[nodeIndex] as any)[property] = value

    return yaml.dump(doc, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      quotingType: '"',
      forceQuotes: false,
    })
  } catch (error) {
    console.error('Error updating node property:', error)
    throw error
  }
}
