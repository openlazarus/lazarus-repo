import type { ConversationAnalysis } from '../../knowledge/types/knowledge.types'

export interface IConversationAnalyzerService {
  /** Analyze a conversation and extract insights. */
  analyzeConversation(
    conversationId: string,
    workspaceId: string,
    userId: string,
    _scope?: 'team' | 'agent',
  ): Promise<ConversationAnalysis>
}
