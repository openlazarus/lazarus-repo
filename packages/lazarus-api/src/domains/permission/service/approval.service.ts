/**
 * Approval Service
 *
 * Re-exports from the approval repository for backwards compatibility.
 * All data access has been moved to repositories/permission/approval.repository.ts.
 */

export {
  approvalRepository as approvalService,
  type PendingApproval,
  type CreateApprovalParams,
} from '@domains/permission/repository/approval.repository'
