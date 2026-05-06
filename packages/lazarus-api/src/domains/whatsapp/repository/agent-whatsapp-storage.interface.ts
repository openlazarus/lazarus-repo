import type { WhatsAppMessage, WhatsAppMessageFilter } from './agent-whatsapp-storage'

export interface IAgentWhatsAppStorage {
  /** Save an incoming WhatsApp message to the agent's directory. */
  saveIncomingMessage(
    agentId: string,
    workspaceId: string,
    message: Omit<WhatsAppMessage, 'id' | 'agentId' | 'workspaceId' | 'triggerEvent'> & {
      id?: string
    },
  ): Promise<WhatsAppMessage>
  /** Save a media attachment and return the relative storage path. */
  saveMediaAttachment(
    agentId: string,
    workspaceId: string,
    messageId: string,
    filename: string,
    content: Buffer,
    contentType?: string,
  ): Promise<string>
  /** Save an outbound message record. */
  saveOutboundMessage(
    agentId: string,
    workspaceId: string,
    message: Omit<
      WhatsAppMessage,
      'id' | 'triggerEvent' | 'metadata' | 'workspaceId' | 'agentId'
    > & {
      id?: string
      metadata?: Partial<WhatsAppMessage['metadata']>
    },
  ): Promise<WhatsAppMessage>
  /** Get a single message by ID (checks inbound and sent). */
  getMessage(
    agentId: string,
    workspaceId: string,
    messageId: string,
  ): Promise<WhatsAppMessage | null>
  /** List messages with optional filtering. */
  listMessages(
    agentId: string,
    workspaceId: string,
    filter?: WhatsAppMessageFilter,
  ): Promise<WhatsAppMessage[]>
  /** Mark a message as read. */
  markAsRead(agentId: string, workspaceId: string, messageId: string): Promise<void>
  /** Get media attachment content by storage path. */
  getMediaAttachment(
    agentId: string,
    workspaceId: string,
    storagePath: string,
  ): Promise<Buffer | null>
  /** Delete a message and its media. */
  deleteMessage(agentId: string, workspaceId: string, messageId: string): Promise<void>
}
