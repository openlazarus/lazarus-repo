import type { PendingApproval, CreateApprovalParams } from './approval.repository'

export interface IApprovalRepository {
  /** Create a new pending approval. */
  createApproval(params: CreateApprovalParams): Promise<PendingApproval>
  /** Resolve (approve or deny) a pending approval. */
  resolveApproval(
    approvalId: string,
    approved: boolean,
    resolvedBy: string,
  ): Promise<PendingApproval>
  /** Get all pending approvals for a workspace. */
  getPendingByWorkspace(workspaceId: string): Promise<PendingApproval[]>
  /** Count pending approvals for a workspace. */
  getPendingCount(workspaceId: string): Promise<number>
  /** Get a single approval by ID. */
  getApproval(approvalId: string): Promise<PendingApproval | null>
  /** Expire all pending approvals for an execution. */
  expireByExecution(executionId: string): Promise<number>
  /** Expire all pending approvals system-wide. */
  expireAllPending(): Promise<number>
}
