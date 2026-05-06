import type { Response } from 'express'
import type { ChatSession } from '@domains/permission/types/permission.types'

export interface IPermissionSessionManager {
  /** Generate a unique request ID. */
  generateRequestId(): string

  /** Register a new session. */
  registerSession(sessionId: string, res: Response, userId: string, teamId: string): void

  /** Get an active session by ID. */
  getSession(sessionId: string): ChatSession | undefined

  /** Add a pending permission request to a session. */
  addPendingRequest(
    sessionId: string,
    requestId: string,
    resolve: (approved: boolean) => void,
    timeout: NodeJS.Timeout,
    toolName: string,
  ): boolean

  /** Resolve a pending permission request. */
  resolvePendingRequest(sessionId: string, requestId: string, approved: boolean): boolean

  /** Add a pending ask-user request to a session. */
  addAskUserRequest(
    sessionId: string,
    requestId: string,
    resolve: (answers: Record<string, string> | null) => void,
    timeout: NodeJS.Timeout,
  ): boolean

  /** Resolve a pending ask-user request. */
  resolveAskUserRequest(
    sessionId: string,
    requestId: string,
    answers: Record<string, string> | null,
  ): boolean

  /** Clean up a session and deny all pending requests. */
  cleanupSession(sessionId: string): void

  /** Get the number of active sessions. */
  getActiveSessionCount(): number

  /** Get the number of pending permission requests. */
  getPendingRequestCount(sessionId?: string): number
}
