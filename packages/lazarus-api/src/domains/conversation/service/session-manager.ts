import * as path from 'path'
import * as fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import type {
  SessionMetadata,
  SessionMessage,
} from '@domains/conversation/types/conversation.types'
import type { ISessionManager } from './session-manager.interface'
import { resolveWorkspacePath } from '@domains/cache/service/workspace-path-cache'
import { STORAGE_BASE_PATH } from '@infrastructure/config/storage'
import { createLogger } from '@utils/logger'
const log = createLogger('session-manager')

export class SessionManager implements ISessionManager {
  private basePath: string

  constructor() {
    this.basePath = STORAGE_BASE_PATH
  }

  /**
   * Get workspace path from settings.path in database
   */
  private async getWorkspacePathFromSettings(workspaceId: string): Promise<string | null> {
    try {
      return await resolveWorkspacePath(workspaceId)
    } catch {
      return null
    }
  }

  /**
   * Get sessions directory for a specific context
   * Uses settings.path from workspace if available
   */
  private async getSessionsDir(userId?: string, workspaceId?: string): Promise<string> {
    // If workspaceId is provided, try to get path from settings
    if (workspaceId) {
      const workspacePath = await this.getWorkspacePathFromSettings(workspaceId)
      if (workspacePath) {
        return path.join(workspacePath, 'sessions')
      }
    }

    // Fallback patterns for legacy or missing settings
    const workspace = workspaceId || 'default'
    if (userId) {
      // User workspace sessions (legacy pattern)
      return path.join(this.basePath, 'users', userId, 'workspaces', workspace, 'sessions')
    }
    // Fallback to global default workspace
    return path.join(this.basePath, 'workspaces', workspace, 'sessions')
  }

  /**
   * Get metadata file path for a specific context
   */
  private async getMetadataPath(userId?: string, workspaceId?: string): Promise<string> {
    const dir = await this.getSessionsDir(userId, workspaceId)
    return path.join(path.dirname(dir), 'sessions.json')
  }

  /**
   * Initialize session storage directories
   */
  private async initialize(userId?: string, workspaceId?: string): Promise<void> {
    const sessionsDir = await this.getSessionsDir(userId, workspaceId)
    const metadataPath = await this.getMetadataPath(userId, workspaceId)

    await fs.mkdir(sessionsDir, { recursive: true })

    // Initialize sessions metadata file if it doesn't exist
    try {
      await fs.access(metadataPath)
    } catch {
      await fs.writeFile(metadataPath, JSON.stringify({}, null, 2))
    }
  }

  /**
   * Create a new session
   * Always creates within a workspace (defaults to 'default' if not specified)
   */
  async createSession(options: {
    workspaceId?: string
    userId?: string
    projectPath?: string
    model?: string
    tools?: string[]
    mcpServers?: Record<string, any>
  }): Promise<string> {
    await this.initialize(options.userId, options.workspaceId)

    const sessionId = uuidv4()
    const metadata: SessionMetadata = {
      id: sessionId,
      ...options,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    }

    // Save metadata
    await this.updateSessionMetadata(sessionId, metadata)

    // Create session transcript file
    const transcriptPath = await this.getTranscriptPath(
      sessionId,
      options.userId,
      options.workspaceId,
    )
    await fs.writeFile(transcriptPath, '')

    return sessionId
  }

  /**
   * Get session metadata
   */
  async getSession(
    sessionId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<SessionMetadata | null> {
    try {
      const allSessions = await this.getAllSessions(userId, workspaceId)
      return allSessions[sessionId] || null
    } catch {
      return null
    }
  }

  /**
   * Get all sessions metadata
   */
  async getAllSessions(
    userId?: string,
    workspaceId?: string,
  ): Promise<Record<string, SessionMetadata>> {
    try {
      const metadataPath = await this.getMetadataPath(userId, workspaceId)
      const data = await fs.readFile(metadataPath, 'utf-8')
      return JSON.parse(data)
    } catch {
      return {}
    }
  }

  /**
   * List sessions for a workspace (defaults to 'default' workspace)
   */
  async listWorkspaceSessions(workspaceId?: string, userId?: string): Promise<SessionMetadata[]> {
    const workspace = workspaceId || 'default'
    const allSessions = await this.getAllSessions(userId, workspace)
    return Object.values(allSessions).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }

  /**
   * List sessions for a user in a workspace (defaults to 'default' workspace)
   */
  async listUserSessions(userId: string, workspaceId?: string): Promise<SessionMetadata[]> {
    const workspace = workspaceId || 'default'
    const allSessions = await this.getAllSessions(userId, workspace)
    return Object.values(allSessions).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(sessionId: string, updates: Partial<SessionMetadata>): Promise<void> {
    // Get existing session to know its context
    const existingSession = updates.userId
      ? await this.getSession(sessionId, updates.userId, updates.workspaceId)
      : null

    const userId = updates.userId || existingSession?.userId
    const workspaceId = updates.workspaceId || existingSession?.workspaceId

    const metadataPath = await this.getMetadataPath(userId, workspaceId)
    const allSessions = await this.getAllSessions(userId, workspaceId)

    allSessions[sessionId] = {
      ...(allSessions[sessionId] || { id: sessionId }),
      ...updates,
      updatedAt: new Date().toISOString(),
    } as SessionMetadata

    await fs.writeFile(metadataPath, JSON.stringify(allSessions, null, 2))
  }

  /**
   * Append a message to session transcript
   */
  async appendMessage(
    sessionId: string,
    message: SessionMessage,
    userId?: string,
    workspaceId?: string,
  ): Promise<void> {
    // First get the session to know its context
    const session = await this.getSession(sessionId, userId, workspaceId)
    if (!session) return

    const transcriptPath = await this.getTranscriptPath(
      sessionId,
      session.userId,
      session.workspaceId,
    )
    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    }

    // Append as JSONL
    await fs.appendFile(transcriptPath, JSON.stringify(messageWithTimestamp) + '\n')

    // Update message count
    await this.updateSessionMetadata(sessionId, {
      userId: session.userId,
      workspaceId: session.workspaceId,
      messageCount: session.messageCount + 1,
      lastPrompt: message.type === 'user' ? message.content : session.lastPrompt,
    })
  }

  /**
   * Get session transcript
   */
  async getTranscript(
    sessionId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<SessionMessage[]> {
    try {
      // Get session to know its context
      const session = await this.getSession(sessionId, userId, workspaceId)
      if (!session) return []

      const transcriptPath = await this.getTranscriptPath(
        sessionId,
        session.userId,
        session.workspaceId,
      )
      const content = await fs.readFile(transcriptPath, 'utf-8')

      if (!content) return []

      return content
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line))
    } catch {
      return []
    }
  }

  /**
   * Mark session as completed
   */
  async completeSession(sessionId: string, userId?: string, workspaceId?: string): Promise<void> {
    const session = await this.getSession(sessionId, userId, workspaceId)
    if (session) {
      await this.updateSessionMetadata(sessionId, {
        status: 'completed',
        userId: session.userId,
        workspaceId: session.workspaceId,
      })
    }
  }

  /**
   * Mark session as interrupted
   */
  async interruptSession(sessionId: string, userId?: string, workspaceId?: string): Promise<void> {
    const session = await this.getSession(sessionId, userId, workspaceId)
    if (session) {
      await this.updateSessionMetadata(sessionId, {
        status: 'interrupted',
        userId: session.userId,
        workspaceId: session.workspaceId,
      })
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string, userId?: string, workspaceId?: string): Promise<void> {
    // Get session to know its context
    const session = await this.getSession(sessionId, userId, workspaceId)
    if (!session) return

    const metadataPath = await this.getMetadataPath(session.userId, session.workspaceId)
    const allSessions = await this.getAllSessions(session.userId, session.workspaceId)
    delete allSessions[sessionId]
    await fs.writeFile(metadataPath, JSON.stringify(allSessions, null, 2))

    // Delete transcript file
    try {
      const transcriptPath = await this.getTranscriptPath(
        sessionId,
        session.userId,
        session.workspaceId,
      )
      await fs.unlink(transcriptPath)
    } catch (err) {
      log.debug({ err }, 'File might not exist')
    }
  }

  /**
   * Clean up old sessions across all contexts
   */
  async cleanupOldSessions(
    daysToKeep: number = 30,
    userId?: string,
    workspaceId?: string,
  ): Promise<number> {
    const allSessions = await this.getAllSessions(userId, workspaceId)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    let deletedCount = 0
    for (const [sessionId, session] of Object.entries(allSessions)) {
      if (new Date(session.updatedAt) < cutoffDate) {
        await this.deleteSession(sessionId, session.userId, session.workspaceId)
        deletedCount++
      }
    }

    return deletedCount
  }

  /**
   * Get transcript file path
   */
  private async getTranscriptPath(
    sessionId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<string> {
    const sessionsDir = await this.getSessionsDir(userId, workspaceId)
    return path.join(sessionsDir, `${sessionId}.jsonl`)
  }

  /**
   * Export session to portable format
   */
  async exportSession(
    sessionId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<{
    metadata: SessionMetadata
    transcript: SessionMessage[]
  } | null> {
    const metadata = await this.getSession(sessionId, userId, workspaceId)
    if (!metadata) return null

    const transcript = await this.getTranscript(sessionId, metadata.userId, metadata.workspaceId)
    return { metadata, transcript }
  }

  /**
   * Import session from exported data
   */
  async importSession(data: {
    metadata: SessionMetadata
    transcript: SessionMessage[]
  }): Promise<string> {
    const { userId, workspaceId } = data.metadata
    await this.initialize(userId, workspaceId)

    const sessionId = data.metadata.id || uuidv4()
    const metadata = {
      ...data.metadata,
      id: sessionId,
      updatedAt: new Date().toISOString(),
    }

    // Save metadata
    await this.updateSessionMetadata(sessionId, metadata)

    // Save transcript
    const transcriptPath = await this.getTranscriptPath(sessionId, userId, workspaceId)
    const transcriptContent = data.transcript.map((msg) => JSON.stringify(msg)).join('\n')

    await fs.writeFile(transcriptPath, transcriptContent + (transcriptContent ? '\n' : ''))

    return sessionId
  }
}

export const sessionManager: ISessionManager = new SessionManager()
