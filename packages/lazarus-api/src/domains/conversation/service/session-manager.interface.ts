import type {
  SessionMetadata,
  SessionMessage,
} from '@domains/conversation/types/conversation.types'

export interface ISessionManager {
  /** Create a new session. */
  createSession(options: {
    workspaceId?: string
    userId?: string
    projectPath?: string
    model?: string
    tools?: string[]
    mcpServers?: Record<string, any>
  }): Promise<string>

  /** Get session metadata. */
  getSession(
    sessionId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<SessionMetadata | null>

  /** Get all sessions metadata. */
  getAllSessions(userId?: string, workspaceId?: string): Promise<Record<string, SessionMetadata>>

  /** List sessions for a workspace. */
  listWorkspaceSessions(workspaceId?: string, userId?: string): Promise<SessionMetadata[]>

  /** List sessions for a user in a workspace. */
  listUserSessions(userId: string, workspaceId?: string): Promise<SessionMetadata[]>

  /** Update session metadata. */
  updateSessionMetadata(sessionId: string, updates: Partial<SessionMetadata>): Promise<void>

  /** Append a message to session transcript. */
  appendMessage(
    sessionId: string,
    message: SessionMessage,
    userId?: string,
    workspaceId?: string,
  ): Promise<void>

  /** Get session transcript. */
  getTranscript(sessionId: string, userId?: string, workspaceId?: string): Promise<SessionMessage[]>

  /** Mark session as completed. */
  completeSession(sessionId: string, userId?: string, workspaceId?: string): Promise<void>

  /** Mark session as interrupted. */
  interruptSession(sessionId: string, userId?: string, workspaceId?: string): Promise<void>

  /** Delete a session. */
  deleteSession(sessionId: string, userId?: string, workspaceId?: string): Promise<void>

  /** Clean up old sessions. */
  cleanupOldSessions(daysToKeep?: number, userId?: string, workspaceId?: string): Promise<number>

  /** Export session to portable format. */
  exportSession(
    sessionId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<{
    metadata: SessionMetadata
    transcript: SessionMessage[]
  } | null>

  /** Import session from exported data. */
  importSession(data: { metadata: SessionMetadata; transcript: SessionMessage[] }): Promise<string>
}
