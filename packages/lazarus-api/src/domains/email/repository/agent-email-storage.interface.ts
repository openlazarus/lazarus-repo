import type { AgentEmail, EmailWebhookPayload, EmailFilter } from './agent-email-storage'

export interface IAgentEmailStorage {
  /** Save an incoming email to the agent's inbox. */
  saveIncomingEmail(
    agentId: string,
    workspaceId: string,
    emailData: EmailWebhookPayload,
  ): Promise<AgentEmail>
  /** Get a single email by message ID. */
  getEmail(agentId: string, workspaceId: string, messageId: string): Promise<AgentEmail | null>
  /** List emails in the agent's inbox with optional filtering. */
  listEmails(agentId: string, workspaceId: string, filter?: EmailFilter): Promise<AgentEmail[]>
  /** Mark an email as read. */
  markAsRead(agentId: string, workspaceId: string, messageId: string): Promise<void>
  /** Get the content of an attachment. */
  getAttachment(agentId: string, workspaceId: string, storagePath: string): Promise<Buffer | null>
  /** Delete an email and its attachments. */
  deleteEmail(agentId: string, workspaceId: string, messageId: string): Promise<void>
}
