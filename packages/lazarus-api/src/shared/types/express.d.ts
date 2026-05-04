/**
 * Extended Express Request type definitions
 *
 * This file extends the Express Request interface to include
 * authentication and authorization context added by middleware.
 */

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string
      email: string
      [key: string]: any
    }

    interface WorkspaceContext {
      id: string
      teamId: string
      role: 'owner' | 'admin' | 'developer' | 'editor' | 'member' | 'viewer'
    }

    interface TeamContext {
      id: string
      role: 'owner' | 'admin' | 'member'
    }

    interface WorkspaceApiKey {
      id: string
      workspaceId?: string
      name: string
      keyHash: string
      keyPrefix: string
      createdAt: string
      lastUsedAt?: string
      expiresAt?: string
      createdBy?: string
      permissions: {
        databases: string[]
        operations: ('read' | 'write' | 'delete')[]
      }
      rateLimit?: number
    }

    interface WorkspaceContextFromApiKey {
      workspaceId: string
      userId: string
      scope: 'user' | 'team' | 'agent'
    }

    interface Request {
      user?: AuthenticatedUser
      workspace?: WorkspaceContext
      team?: TeamContext
      apiKey?: WorkspaceApiKey
      workspaceContext?: WorkspaceContextFromApiKey
      /** Set by workspace-id middleware from `x-workspace-id` header */
      workspaceId?: string
      rawBody?: string
    }
  }
}

export {}
