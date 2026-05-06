import * as crypto from 'crypto'
import type { Response } from 'express'

import type { ChatSession } from '@domains/permission/types/permission.types'
import type { IPermissionSessionManager } from './session-manager.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('session-manager')

export class PermissionSessionManager implements IPermissionSessionManager {
  private activeSessions = new Map<string, ChatSession>()
  private static instance: PermissionSessionManager

  private constructor() {}

  static getInstance(): PermissionSessionManager {
    if (!PermissionSessionManager.instance) {
      PermissionSessionManager.instance = new PermissionSessionManager()
    }
    return PermissionSessionManager.instance
  }

  generateRequestId(): string {
    return `perm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  }

  registerSession(sessionId: string, res: Response, userId: string, teamId: string): void {
    log.info(`Registering session: ${sessionId}`)
    this.activeSessions.set(sessionId, {
      res,
      userId,
      teamId,
      sessionId,
      startTime: new Date(),
      pendingRequests: new Map(),
      pendingAskUserRequests: new Map(),
    })
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.activeSessions.get(sessionId)
  }

  addPendingRequest(
    sessionId: string,
    requestId: string,
    resolve: (approved: boolean) => void,
    timeout: NodeJS.Timeout,
    toolName: string,
  ): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      log.error(`Session not found: ${sessionId}`)
      return false
    }

    session.pendingRequests.set(requestId, {
      resolve,
      timeout,
      requestId,
      toolName,
      startTime: new Date(),
    })

    log.info(`Added pending request ${requestId} for tool ${toolName}`)
    return true
  }

  resolvePendingRequest(sessionId: string, requestId: string, approved: boolean): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      log.error(`Session not found: ${sessionId}`)
      return false
    }

    const pending = session.pendingRequests.get(requestId)
    if (!pending) {
      log.error(`Pending request not found: ${requestId}`)
      return false
    }

    const duration = Date.now() - pending.startTime.getTime()
    log.info(
      `Resolving request ${requestId}: ${approved ? 'APPROVED' : 'DENIED'} (took ${duration}ms)`,
    )

    clearTimeout(pending.timeout)
    pending.resolve(approved)
    session.pendingRequests.delete(requestId)

    return true
  }

  addAskUserRequest(
    sessionId: string,
    requestId: string,
    resolve: (answers: Record<string, string> | null) => void,
    timeout: NodeJS.Timeout,
  ): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      log.error(`Session not found for ask-user request: ${sessionId}`)
      return false
    }

    session.pendingAskUserRequests.set(requestId, {
      resolve,
      timeout,
      requestId,
      startTime: new Date(),
    })

    log.info(`Added pending ask-user request ${requestId}`)
    return true
  }

  resolveAskUserRequest(
    sessionId: string,
    requestId: string,
    answers: Record<string, string> | null,
  ): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      log.error(`Session not found for ask-user resolve: ${sessionId}`)
      return false
    }

    const pending = session.pendingAskUserRequests.get(requestId)
    if (!pending) {
      log.error(`Ask-user request not found: ${requestId}`)
      return false
    }

    const duration = Date.now() - pending.startTime.getTime()
    log.info(
      `Resolving ask-user request ${requestId}: ${answers ? 'ANSWERED' : 'CANCELLED'} (took ${duration}ms)`,
    )

    clearTimeout(pending.timeout)
    pending.resolve(answers)
    session.pendingAskUserRequests.delete(requestId)

    return true
  }

  cleanupSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      // Clear all pending timeouts
      session.pendingRequests.forEach((pending) => {
        clearTimeout(pending.timeout)
        pending.resolve(false) // Deny on cleanup
      })
      session.pendingRequests.clear()

      // Clear all pending ask-user requests
      session.pendingAskUserRequests.forEach((pending) => {
        clearTimeout(pending.timeout)
        pending.resolve(null) // Cancel on cleanup
      })
      session.pendingAskUserRequests.clear()

      this.activeSessions.delete(sessionId)
      log.info(`Cleaned up session: ${sessionId}`)
    }
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size
  }

  getPendingRequestCount(sessionId?: string): number {
    if (sessionId) {
      const session = this.activeSessions.get(sessionId)
      return session ? session.pendingRequests.size : 0
    }

    let total = 0
    this.activeSessions.forEach((session) => {
      total += session.pendingRequests.size
    })
    return total
  }
}
