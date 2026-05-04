export interface IWhatsAppQueueService {
  /** Set the trigger execution function. */
  setExecutor(
    fn: (
      workspaceId: string,
      userId: string,
      agentId: string,
      workspacePath: string,
      message: any,
      activityLogId?: string,
      phoneNumberId?: string,
    ) => Promise<void>,
  ): void

  /** Enqueue a message for processing. */
  enqueue(item: {
    workspaceId: string
    userId: string
    agentId: string
    workspacePath: string
    message: any
    activityLogId?: string
    phoneNumberId?: string
  }): Promise<void>

  /** Get the current queue size for an agent. */
  getQueueSize(workspaceId: string, agentId: string): number

  /** Check if an agent is currently processing a message. */
  isProcessing(workspaceId: string, agentId: string): boolean

  /** Clear the queue for an agent. */
  clearQueue(workspaceId: string, agentId: string): void
}
