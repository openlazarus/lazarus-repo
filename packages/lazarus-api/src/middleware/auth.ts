import { Request, Response, NextFunction } from 'express'
import { supabase } from '@infrastructure/database/supabase'
import { createLogger } from '@utils/logger'
import { TtlCache } from '@domains/cache/service/ttl-cache'
import { isValidId } from '@utils/id-validation'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'

const log = createLogger('auth')

// Cache verified tokens for 60 seconds (JWT is immutable until expiry)
const tokenCache = new TtlCache<string, AuthenticatedUser>({
  ttlMs: 60_000,
  maxSize: 500,
})

// Cache workspace roles for 30 seconds (roles rarely change)
const workspaceRoleCache = new TtlCache<string, string | null>({
  ttlMs: 30_000,
  maxSize: 1_000,
})

// Cache team roles for 30 seconds
const teamRoleCache = new TtlCache<string, string | null>({
  ttlMs: 30_000,
  maxSize: 1_000,
})

/**
 * Centralized Authentication & Authorization Middleware
 *
 * This middleware provides:
 * - JWT token validation
 * - User authentication
 * - Workspace access validation
 * - Team membership validation
 * - Role-based authorization
 */

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

/**
 * Verify Supabase JWT token and extract user data
 */
async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  const cached = tokenCache.get(token)
  if (cached) return cached

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      log.error({ error: error?.message }, 'Token verification failed')
      return null
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email || '',
      ...user.user_metadata,
    }

    tokenCache.set(token, authUser)
    return authUser
  } catch (error) {
    log.error({ err: error }, 'Token verification error')
    return null
  }
}

/**
 * Extract workspace ID from request (params or headers)
 */
function getWorkspaceId(_req: Request): string | null {
  // Workspace VM is pinned via process.env.WORKSPACE_ID — single source of truth.
  return process.env.WORKSPACE_ID ?? null
}

/**
 * Extract team ID from request (params or headers)
 */
function getTeamId(req: Request): string | null {
  // Try URL params first
  if (req.params.teamId) {
    return req.params.teamId
  }

  // Try header
  const headerTeamId = req.headers['x-team-id'] as string
  if (headerTeamId) {
    return headerTeamId
  }

  return null
}

/**
 * Get team ID from workspace
 * Note: team_id column doesn't exist in current schema, this returns null
 * and relies on workspace owner_id/user_id for authorization
 */
async function getTeamIdFromWorkspace(_workspaceId: string): Promise<string | null> {
  // team_id column doesn't exist in current schema
  // Authorization is handled via owner_id/user_id in workspace
  return null
}

/**
 * Get user's role in workspace
 */
async function getUserWorkspaceRole(userId: string, workspaceId: string): Promise<string | null> {
  if (!isValidId(userId) || !isValidId(workspaceId)) return null

  const cacheKey = `${userId}:${workspaceId}`
  const cached = workspaceRoleCache.get(cacheKey)
  if (cached !== undefined) return cached

  try {
    // Check if user is workspace owner
    const ownerIds = await workspaceRepository.getWorkspaceOwnerIds(workspaceId)

    const ownerId = ownerIds?.owner_id || ownerIds?.user_id
    if (ownerIds && ownerId === userId) {
      workspaceRoleCache.set(cacheKey, 'owner')
      return 'owner'
    }

    // Check workspace_members table
    const role = await workspaceRepository.getWorkspaceMemberRole(workspaceId, userId)

    if (role) {
      workspaceRoleCache.set(cacheKey, role)
      return role
    }

    workspaceRoleCache.set(cacheKey, null)
    return null
  } catch (error) {
    log.error({ err: error }, 'Error getting workspace role')
    return null
  }
}

/**
 * Get user's role for a workspace, keyed by the same ID callers pass as "team"
 * (URL/header team id is treated as workspace id; queries workspace_members).
 */
async function getUserTeamRole(userId: string, workspaceId: string): Promise<string | null> {
  if (!isValidId(userId) || !isValidId(workspaceId)) return null

  const cacheKey = `${userId}:${workspaceId}`
  const cached = teamRoleCache.get(cacheKey)
  if (cached !== undefined) return cached

  try {
    const role = await workspaceRepository.getWorkspaceMemberRole(workspaceId, userId)

    if (role) {
      teamRoleCache.set(cacheKey, role)
      return role
    }

    teamRoleCache.set(cacheKey, null)
    return null
  } catch (error) {
    log.error({ err: error }, 'Error getting team role')
    return null
  }
}

/**
 * Middleware: Require authentication
 * Validates JWT token and attaches user to request
 */
export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Fallback: Check for x-user-id header (for backwards compatibility during migration)
        const userId = req.headers['x-user-id'] as string
        if (userId) {
          log.warn('Using fallback x-user-id header (migration mode)')
          req.user = { id: userId, email: '' }
          return next()
        }

        return res.status(401).json({
          error: 'Authentication required',
          message: 'Missing or invalid Authorization header',
        })
      }

      const token = authHeader.substring(7) // Remove 'Bearer ' prefix

      // Verify token
      const user = await verifyToken(token)

      if (!user) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Token verification failed',
        })
      }

      // Attach user to request
      req.user = user

      next()
    } catch (error) {
      log.error({ err: error }, 'Authentication error')
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Internal server error during authentication',
      })
    }
  }
}

/**
 * Middleware: Optional authentication
 * Validates token if present but doesn't fail if missing
 */
export function optionalAuth() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const user = await verifyToken(token)

        if (user) {
          req.user = user
        }
      }

      // Continue even if no token or invalid token
      return next()
    } catch (error) {
      log.error({ err: error }, 'Optional auth error')
      return next() // Continue anyway
    }
  }
}

/**
 * Middleware: Require workspace access
 * Validates that user has access to the workspace
 * Must be used after requireAuth()
 */
export function requireWorkspaceAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated',
        })
      }

      const workspaceId = getWorkspaceId(req)

      if (!workspaceId) {
        return res.status(400).json({
          error: 'Workspace ID required',
          message: 'No workspace ID in URL or headers',
        })
      }

      // Get user's role in workspace
      const role = await getUserWorkspaceRole(req.user.id, workspaceId)

      if (!role) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this workspace',
        })
      }

      // Get team ID from workspace
      const teamId = await getTeamIdFromWorkspace(workspaceId)

      // Attach workspace context to request
      req.workspace = {
        id: workspaceId,
        teamId: teamId || '',
        role: role as any,
      }

      return next()
    } catch (error) {
      log.error({ err: error }, 'Workspace access error')
      return res.status(500).json({
        error: 'Authorization error',
        message: 'Internal server error during authorization',
      })
    }
  }
}

/**
 * Middleware: Require workspace admin
 * Validates that user is admin or owner of the workspace
 * Must be used after requireAuth() and requireWorkspaceAccess()
 */
export function requireWorkspaceAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
        })
      }

      if (!req.workspace) {
        return res.status(400).json({
          error: 'Workspace context required',
          message: 'Use requireWorkspaceAccess() before requireWorkspaceAdmin()',
        })
      }

      const { role } = req.workspace

      if (role !== 'owner' && role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'You must be an admin or owner to perform this action',
        })
      }

      return next()
    } catch (error) {
      log.error({ err: error }, 'Workspace admin check error')
      return res.status(500).json({
        error: 'Authorization error',
      })
    }
  }
}

/**
 * Middleware: Require workspace editor (or higher)
 * Validates that user is editor, admin, or owner of the workspace
 * Must be used after requireAuth() and requireWorkspaceAccess()
 */
export function requireWorkspaceEditor() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
        })
      }

      if (!req.workspace) {
        return res.status(400).json({
          error: 'Workspace context required',
          message: 'Use requireWorkspaceAccess() before requireWorkspaceEditor()',
        })
      }

      const { role } = req.workspace

      // Allow owner, admin, or editor
      if (role !== 'owner' && role !== 'admin' && role !== 'editor') {
        return res.status(403).json({
          error: 'Editor access required',
          message: 'You must be an editor, admin, or owner to perform this action',
        })
      }

      return next()
    } catch (error) {
      log.error({ err: error }, 'Workspace editor check error')
      return res.status(500).json({
        error: 'Authorization error',
      })
    }
  }
}

/**
 * Middleware: Require specific workspace role(s)
 * Validates that user has one of the allowed roles in the workspace
 * Must be used after requireAuth() and requireWorkspaceAccess()
 *
 * @param allowedRoles - Array of roles that are allowed to access this endpoint
 * @example requireWorkspaceRole('owner', 'developer') // Only owners and developers
 * @example requireWorkspaceRole('owner', 'admin', 'editor') // Owners, admins, and editors
 */
export function requireWorkspaceRole(...allowedRoles: WorkspaceContext['role'][]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
        })
      }

      if (!req.workspace) {
        return res.status(400).json({
          error: 'Workspace context required',
          message: 'Use requireWorkspaceAccess() before requireWorkspaceRole()',
        })
      }

      const { role } = req.workspace

      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        })
      }

      return next()
    } catch (error) {
      log.error({ err: error }, 'Workspace role check error')
      return res.status(500).json({
        error: 'Authorization error',
      })
    }
  }
}

/**
 * Middleware: Require team access
 * Validates that user is a member of the team
 * Must be used after requireAuth()
 */
export function requireTeamAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
        })
      }

      const teamId = getTeamId(req)

      if (!teamId) {
        return res.status(400).json({
          error: 'Team ID required',
          message: 'No team ID in URL or headers',
        })
      }

      // Get user's role in team
      const role = await getUserTeamRole(req.user.id, teamId)

      if (!role) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You are not a member of this team',
        })
      }

      // Attach team context to request
      req.team = {
        id: teamId,
        role: role as any,
      }

      return next()
    } catch (error) {
      log.error({ err: error }, 'Team access error')
      return res.status(500).json({
        error: 'Authorization error',
      })
    }
  }
}

/**
 * Middleware: Require team admin
 * Validates that user is admin or owner of the team
 * Must be used after requireAuth() and requireTeamAccess()
 */
export function requireTeamAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
        })
      }

      if (!req.team) {
        return res.status(400).json({
          error: 'Team context required',
          message: 'Use requireTeamAccess() before requireTeamAdmin()',
        })
      }

      const { role } = req.team

      if (role !== 'owner' && role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'You must be a team admin or owner to perform this action',
        })
      }

      return next()
    } catch (error) {
      log.error({ err: error }, 'Team admin check error')
      return res.status(500).json({
        error: 'Authorization error',
      })
    }
  }
}

/**
 * Utility: Check if user owns a resource
 */
export function requireResourceOwner(resourceUserIdGetter: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const resourceUserId = resourceUserIdGetter(req)

    if (req.user.id !== resourceUserId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources',
      })
    }

    return next()
  }
}
