// Flow Document Types

export type NodeType = 'concept' | 'action' | 'decision' | 'note' | 'group'
export type NodeStyle =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'subtle'
  | 'ghost'
export type ConnectionType = 'flow' | 'dependency' | 'association' | 'hierarchy'
export type ConnectionStyle = 'solid' | 'dashed' | 'dotted'
export type LayoutType = 'auto' | 'grid' | 'force' | 'tree'
export type ThemeType = 'light' | 'dark' | 'auto'
export type SpacingType = 'compact' | 'comfortable' | 'spacious'
export type Direction =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'northeast'
  | 'southeast'
  | 'northwest'
  | 'southwest'
export type Distance = 'near' | 'medium' | 'far'
export type Status = 'draft' | 'review' | 'approved' | 'archived'
export type Priority = 'low' | 'medium' | 'high' | 'critical'

export interface FlowMeta {
  title: string
  description?: string
  author?: string
  version?: string
  tags?: string[]
}

export interface FlowCanvas {
  layout?: LayoutType
  theme?: ThemeType
  spacing?: SpacingType
}

export interface Position {
  x: number
  y: number
}

export interface RelativePosition {
  relative: string
  direction: Direction
  distance?: Distance
}

export interface NodeProperties {
  status?: Status
  priority?: Priority
  assignee?: string
  dueDate?: Date
}

export interface FlowNode {
  id: string
  type: NodeType
  title: string
  content?: string
  position: 'auto' | 'center' | Position | RelativePosition
  style?: NodeStyle
  icon?: string
  properties?: NodeProperties
}

export interface FlowConnection {
  from: string
  to: string | string[]
  type?: ConnectionType
  style?: ConnectionStyle
  label?: string
  bidirectional?: boolean
}

export interface FlowContainer {
  id: string
  title: string
  description?: string
  contains: string[]
  style?: 'default' | 'subtle' | 'emphasized'
  collapsed?: boolean
}

export interface FlowLayer {
  id: string
  name: string
  visible?: boolean
  nodes: string[]
}

export interface FlowAnnotation {
  id: string
  target: string
  content: string
  author?: string
  timestamp?: Date
  resolved?: boolean
}

export interface FlowDocument {
  flow: {
    meta?: FlowMeta
    canvas?: FlowCanvas
    nodes: FlowNode[]
    connections?: FlowConnection[]
    containers?: FlowContainer[]
    layers?: FlowLayer[]
    annotations?: FlowAnnotation[]
  }
}

// Parsed data structure for rendering
export interface ParsedNode extends FlowNode {
  computedPosition: Position
  connections: string[]
}

export interface ParsedConnection {
  id: string
  from: string
  to: string
  type: ConnectionType
  style: ConnectionStyle
  label?: string
  bidirectional: boolean
}

export interface ParsedFlowData {
  meta: FlowMeta
  canvas: Required<FlowCanvas>
  nodes: Map<string, ParsedNode>
  connections: ParsedConnection[]
  containers: FlowContainer[]
  layers: FlowLayer[]
  annotations: FlowAnnotation[]
}
