/**
 * Knowledge Graph Types (Frontend)
 * Mirrors backend types from lazarus-ts/src/types/librarian.ts
 */

export type ArtifactType = 'event' | 'concept' | 'pattern' | 'context'

export interface KnowledgeArtifact {
  id: string
  type: ArtifactType
  title: string
  content: string // Markdown content
  metadata: Record<string, any>
  tags: string[]
  links: string[] // Wikilinks to other artifacts [[title]]
  backlinks: string[] // IDs of artifacts that link to this one
  filePath: string
  createdAt: string
  updatedAt: string
}

export interface KnowledgeGraphNode {
  id: string
  type: ArtifactType
  title: string
  tags: string[]
  importance?: string
  createdAt: string
  filePath: string
}

export interface KnowledgeGraphEdge {
  source: string // artifact ID
  target: string // artifact ID
  type: 'reference' // Could expand to other types
}

export interface KnowledgeGraphStats {
  totalArtifacts: number
  artifactsByType: Record<ArtifactType, number>
  totalTags: number
  totalLinks: number
  mostConnected: Array<{
    id: string
    title: string
    connections: number
  }>
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[]
  edges: KnowledgeGraphEdge[]
  stats: KnowledgeGraphStats
}

export interface KnowledgeSearchQuery {
  query?: string
  types?: ArtifactType[]
  tags?: string[]
  dateRange?: {
    from: string
    to: string
  }
  relatedTo?: string // artifact ID
  limit?: number
  offset?: number
}

export interface KnowledgeSearchResult {
  artifacts: KnowledgeArtifact[]
  total: number
  query: KnowledgeSearchQuery
}

// Frontend-specific types

export interface ArtifactCardProps {
  artifact: KnowledgeArtifact
  onSelect?: (artifact: KnowledgeArtifact) => void
  selected?: boolean
  compact?: boolean
}

export interface GraphViewMode {
  type: '2d' | '3d' | 'list'
  layout: 'force' | 'radial' | 'hierarchical'
}

export interface KnowledgeFilters {
  types: Set<ArtifactType>
  tags: Set<string>
  dateRange?: {
    from: Date
    to: Date
  }
  searchQuery: string
}
