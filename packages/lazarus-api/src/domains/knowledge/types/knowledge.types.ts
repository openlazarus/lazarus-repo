// Knowledge Artifact Types
export type ArtifactType = 'event' | 'concept' | 'pattern' | 'context'

export type TMemoryScope = 'workspace' | 'agent' | 'both'

export interface ITagCount {
  tag: string
  count: number
}

export interface KnowledgeArtifact {
  id: string
  type: ArtifactType
  title: string
  content: string // Markdown content
  metadata: ArtifactMetadata
  links: string[] // Wikilinks to other artifacts [[artifact-name]]
  backlinks: string[] // Artifacts that link to this one
  tags: string[]
  filePath: string // Relative path in .knowledge folder
  createdAt: string
  updatedAt: string
}

export interface ArtifactMetadata {
  date?: string // For events
  conversationId?: string // Source conversation if applicable
  relatedArtifacts?: string[] // Explicit related links
  importance?: 'low' | 'medium' | 'high'
  [key: string]: any // Additional custom metadata
}

// Specific artifact types
export interface MemoryEvent extends KnowledgeArtifact {
  type: 'event'
  metadata: ArtifactMetadata & {
    date: string
    conversationId?: string
  }
}

export interface Concept extends KnowledgeArtifact {
  type: 'concept'
  metadata: ArtifactMetadata & {
    category?: string
    relatedConcepts?: string[]
  }
}

export interface Pattern extends KnowledgeArtifact {
  type: 'pattern'
  metadata: ArtifactMetadata & {
    applicability?: string
    examples?: string[]
  }
}

export interface Context extends KnowledgeArtifact {
  type: 'context'
  metadata: ArtifactMetadata & {
    project?: string
    evolutionStage?: string
  }
}

// Conversation Analysis Types
export interface ConversationAnalysis {
  conversationId: string
  workspaceId: string
  userId: string
  analyzedAt: string
  insights: ConversationInsight[]
  extractedConcepts: ExtractedConcept[]
  keyDecisions: KeyDecision[]
  codePatterns: CodePattern[]
  suggestedArtifacts: SuggestedArtifact[]
}

export interface ConversationInsight {
  type: 'technical' | 'architectural' | 'problem-solving' | 'learning'
  description: string
  relevance: 'low' | 'medium' | 'high'
  context?: string
}

export interface ExtractedConcept {
  name: string
  description: string
  category?: string
  relatedTo?: string[]
  codeReferences?: string[]
}

export interface KeyDecision {
  decision: string
  reasoning: string
  alternatives?: string[]
  timestamp?: string
  impact: 'low' | 'medium' | 'high'
}

export interface CodePattern {
  name: string
  description: string
  code?: string
  language?: string
  applicability?: string
}

export interface SuggestedArtifact {
  type: ArtifactType
  title: string
  content: string
  tags: string[]
  links: string[]
  metadata: ArtifactMetadata
}

// Knowledge Graph Types
export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[]
  edges: KnowledgeGraphEdge[]
  stats: KnowledgeGraphStats
}

export interface KnowledgeGraphNode {
  id: string
  type: ArtifactType
  title: string
  tags: string[]
  importance?: 'low' | 'medium' | 'high'
  createdAt: string
  filePath: string
}

export interface KnowledgeGraphEdge {
  source: string // artifact id
  target: string // artifact id
  type: 'reference' | 'related' | 'derived-from' | 'implements'
}

export interface KnowledgeGraphStats {
  totalArtifacts: number
  artifactsByType: Record<ArtifactType, number>
  totalTags: number
  totalLinks: number
  mostConnected: Array<{ id: string; title: string; connections: number }>
}

// Search & Query Types
export interface KnowledgeSearchQuery {
  query?: string
  types?: ArtifactType[]
  tags?: string[]
  dateRange?: {
    from: string
    to: string
  }
  relatedTo?: string // artifact id
  limit?: number
  offset?: number
}

export interface KnowledgeSearchResult {
  artifacts: KnowledgeArtifact[]
  total: number
  facets: {
    types: Record<ArtifactType, number>
    tags: Record<string, number>
  }
}

// Librarian Task Types (for email-based async processing)
export interface LibrarianTask {
  tool:
    | 'analyze_conversation'
    | 'distill_knowledge'
    | 'create_memory_artifact'
    | 'update_knowledge_graph'
  input: LibrarianTaskInput
}

export type LibrarianTaskInput =
  | AnalyzeConversationInput
  | DistillKnowledgeInput
  | CreateArtifactInput
  | UpdateGraphInput

export interface AnalyzeConversationInput {
  conversationId: string
  workspaceId: string
  userId: string
  scope?: 'team' | 'agent'
}

export interface DistillKnowledgeInput {
  conversationIds: string[]
  workspaceId: string
  userId: string
  scope?: 'team' | 'agent'
}

export interface CreateArtifactInput {
  artifact: Omit<KnowledgeArtifact, 'id' | 'createdAt' | 'updatedAt' | 'backlinks'>
  workspaceId: string
  userId: string
  scope?: 'team' | 'agent'
}

export interface UpdateGraphInput {
  workspaceId: string
  userId: string
  scope?: 'team' | 'agent'
}

// Librarian Agent Config
export interface LibrarianConfig {
  pollInterval: number // milliseconds
  maxConversationsPerBatch: number
  analysisPromptTemplate: string
  minConversationLength: number // minimum messages to analyze
  maxArtifactsPerConversation: number
}
