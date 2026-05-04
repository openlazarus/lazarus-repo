import type { V0TokenData } from '@domains/v0/types/v0.types'

export interface IV0TokenService {
  /** Generate a short-lived token for v0 app authentication. */
  generateToken(
    userId: string,
    workspaceId: string,
    v0ProjectId: string,
  ): { token: string; expiresAt: number }

  /** Validate and consume a token (one-time use). */
  validateToken(token: string): V0TokenData | null

  /** Manually cleanup expired tokens. */
  cleanupExpiredTokens(): number

  /** Get statistics about active tokens. */
  getStats(): { activeTokens: number }
}
