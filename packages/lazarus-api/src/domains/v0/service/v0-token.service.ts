import * as crypto from 'crypto'
import type { V0TokenData } from '@domains/v0/types/v0.types'
import type { IV0TokenService } from './v0-token.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('v0-token')

/**
 * Service for managing short-lived tokens for v0 app authentication
 */
export class V0TokenService implements IV0TokenService {
  private tokens = new Map<string, V0TokenData>()
  private readonly TOKEN_LIFETIME_MS = 5 * 60 * 1000 // 5 minutes

  /**
   * Generate a short-lived token for v0 app authentication
   */
  generateToken(
    userId: string,
    workspaceId: string,
    v0ProjectId: string,
  ): { token: string; expiresAt: number } {
    const token = `tok_${crypto.randomBytes(32).toString('base64url')}`
    const expiresAt = Date.now() + this.TOKEN_LIFETIME_MS

    this.tokens.set(token, {
      userId,
      workspaceId,
      v0ProjectId,
      expiresAt,
    })

    // Auto-cleanup after expiry
    setTimeout(() => {
      this.tokens.delete(token)
    }, this.TOKEN_LIFETIME_MS)

    return { token, expiresAt }
  }

  /**
   * Validate and consume a token (one-time use)
   * Returns the token data if valid, null otherwise
   */
  validateToken(token: string): V0TokenData | null {
    const data = this.tokens.get(token)

    if (!data) {
      return null
    }

    // Check if expired
    if (Date.now() > data.expiresAt) {
      this.tokens.delete(token)
      return null
    }

    // One-time use - delete after validation
    this.tokens.delete(token)

    return data
  }

  /**
   * Manually cleanup expired tokens (called periodically)
   */
  cleanupExpiredTokens(): number {
    const now = Date.now()
    let deletedCount = 0

    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expiresAt) {
        this.tokens.delete(token)
        deletedCount++
      }
    }

    return deletedCount
  }

  /**
   * Get statistics about active tokens (for monitoring)
   */
  getStats(): { activeTokens: number } {
    // Clean up first
    this.cleanupExpiredTokens()

    return {
      activeTokens: this.tokens.size,
    }
  }
}

// Export singleton instance
export const v0TokenService: IV0TokenService = new V0TokenService()

// Periodic cleanup every minute
setInterval(() => {
  const deleted = v0TokenService.cleanupExpiredTokens()
  if (deleted > 0) {
    log.info(`Cleaned up ${deleted} expired tokens`)
  }
}, 60 * 1000)
