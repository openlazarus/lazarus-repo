import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'
import type {
  WorkspaceMemberEmail,
  EmailValidationResult,
} from '@domains/workspace/types/workspace.types'
import type { IWorkspaceMemberService } from './workspace-member.service.interface'
import { createLogger } from '@utils/logger'

const log = createLogger('workspace-member-service')

/**
 * Service for querying workspace members and their emails
 * Used for email security validation - agents can only email workspace members
 */
/**
 * Extract bare email address from a string that may contain a display name.
 * "Jane Doe <jane@example.com>" -> "jane@example.com"
 * "jane@example.com" -> "jane@example.com"
 */
function extractEmail(input: string): string {
  const match = input.match(/<([^>]+)>/)
  return (match ? match[1]! : input).trim().toLowerCase()
}

export class WorkspaceMemberService implements IWorkspaceMemberService {
  /**
   * Get all workspace member emails (owner + members)
   * Returns list of emails for all users who have access to this workspace
   */
  async getWorkspaceMemberEmails(workspaceId: string): Promise<WorkspaceMemberEmail[]> {
    const members: WorkspaceMemberEmail[] = []

    try {
      // 1. Get workspace owner
      const ownerId = await workspaceRepository.getWorkspaceOwnerId(workspaceId)

      if (!ownerId) {
        log.error('Failed to get workspace owner')
        return members
      }

      // 2. Get owner email from profiles
      const ownerProfile = await workspaceRepository.getProfileEmail(ownerId)

      if (ownerProfile?.email) {
        members.push({
          userId: ownerProfile.id,
          email: ownerProfile.email.toLowerCase(),
          role: 'owner',
        })
      }

      // 3. Get workspace members
      const workspaceMembers = await workspaceRepository.getWorkspaceMembersByWorkspace(workspaceId)

      if (workspaceMembers.length > 0) {
        // 4. Get member emails
        const memberIds = workspaceMembers.map((m) => m.user_id)
        const memberProfiles = await workspaceRepository.getProfileEmails(memberIds)

        for (const profile of memberProfiles) {
          if (profile.email) {
            const memberRole =
              workspaceMembers.find((m) => m.user_id === profile.id)?.role || 'viewer'
            // Skip if already added as owner
            if (!members.some((m) => m.userId === profile.id)) {
              members.push({
                userId: profile.id,
                email: profile.email.toLowerCase(),
                role: memberRole as 'admin' | 'editor' | 'viewer',
              })
            }
          }
        }
      }

      log.info({ workspaceId, memberCount: members.length }, 'Found workspace members')
      return members
    } catch (error) {
      log.error({ err: error }, 'Error getting workspace members')
      return members
    }
  }

  /**
   * Check if a single email is a workspace member
   * Comparison is case-insensitive
   */
  async isWorkspaceMember(workspaceId: string, email: string): Promise<boolean> {
    const members = await this.getWorkspaceMemberEmails(workspaceId)
    const normalizedEmail = extractEmail(email)
    return members.some((m) => m.email === normalizedEmail)
  }

  /**
   * Validate multiple emails, return valid/invalid lists
   * Case-insensitive comparison
   */
  async validateRecipientEmails(
    workspaceId: string,
    emails: string[],
  ): Promise<EmailValidationResult> {
    const members = await this.getWorkspaceMemberEmails(workspaceId)
    const memberEmails = new Set(members.map((m) => m.email))

    const valid: string[] = []
    const invalid: string[] = []

    for (const email of emails) {
      const normalizedEmail = extractEmail(email)
      if (memberEmails.has(normalizedEmail)) {
        valid.push(email)
      } else {
        invalid.push(email)
      }
    }

    return { valid, invalid }
  }
}

// Export singleton instance
export const workspaceMemberService: IWorkspaceMemberService = new WorkspaceMemberService()
