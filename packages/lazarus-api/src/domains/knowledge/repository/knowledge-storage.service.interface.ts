import type {
  ITagCount,
  KnowledgeArtifact,
  KnowledgeGraph,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  TMemoryScope,
} from '@domains/knowledge/types/knowledge.types'

export interface IKnowledgeStorageService {
  saveArtifact(
    workspaceId: string,
    artifact: KnowledgeArtifact,
    agentId?: string,
  ): Promise<KnowledgeArtifact>
  getArtifact(
    workspaceId: string,
    artifactId: string,
    agentId?: string,
  ): Promise<KnowledgeArtifact | null>
  getKnowledgeGraph(workspaceId: string, agentId?: string): Promise<KnowledgeGraph>
  updateKnowledgeGraph(workspaceId: string, agentId?: string): Promise<KnowledgeGraph>
  searchKnowledge(
    workspaceId: string,
    query: KnowledgeSearchQuery,
    agentId?: string,
  ): Promise<KnowledgeSearchResult>
  listTags(workspaceId: string, agentId?: string, scope?: TMemoryScope): Promise<ITagCount[]>
  deleteArtifact(workspaceId: string, artifactId: string, agentId?: string): Promise<boolean>
}
