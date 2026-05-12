export interface IWorkspaceAgentExecutor {
  /** Execute an agent task using workspace file-based agent config. */
  executeAgent(request: {
    agentId: string
    workspaceId: string
    userId: string
    task: string
    maxTurns?: number
    onMessage?: (message: any) => void
    executionId?: string
    platformSource?: 'discord' | 'slack' | 'email' | 'chat' | 'whatsapp'
    conversationTitle?: string
    platformMetadata?: {
      channelId?: string
      channelName?: string
      threadId?: string
      guildId?: string
      guildName?: string
      userName?: string
      userId?: string
      phoneNumberId?: string
      senderPhone?: string
    }
    existingActivityLogId?: string
    cascadeDepth?: number
  }): Promise<{ result: any; messages: any[]; model?: string; toolErrors?: string[] }>
}
