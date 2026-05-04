import type {
  WorkspaceMemberEmail,
  EmailValidationResult,
} from '@domains/workspace/types/workspace.types'

export interface IWorkspaceMemberService {
  /** Get all workspace member emails (owner + members). */
  getWorkspaceMemberEmails(workspaceId: string): Promise<WorkspaceMemberEmail[]>

  /** Check if a single email is a workspace member. */
  isWorkspaceMember(workspaceId: string, email: string): Promise<boolean>

  /** Validate multiple emails, return valid/invalid lists. */
  validateRecipientEmails(workspaceId: string, emails: string[]): Promise<EmailValidationResult>
}
