import type {
  PendingPermission,
  RegisterPersistentParams,
} from '@domains/permission/types/permission.types'

export interface IBackgroundPermissionManager {
  /** Register a channel-based pending permission request. */
  register(
    requestId: string,
    channelKey: string,
    resolve: (approved: boolean) => void,
    timeoutMs: number,
    platform: string,
    toolName: string,
  ): void

  /** Register a persistent permission request (UI-based, no timeout). */
  registerPersistent(params: RegisterPersistentParams): Promise<void>

  /** Resolve a pending permission by requestId. */
  resolve(requestId: string, approved: boolean, resolvedBy?: string): void

  /** Find a pending permission by channel key. */
  findByChannelKey(channelKey: string): PendingPermission | undefined

  /** Resolve a pending permission by channel key. */
  resolveByChannelKey(channelKey: string, approved: boolean): void

  /** Clean up a specific request without resolving it. */
  cleanup(requestId: string): void

  /** Recover on startup: expire all pending approvals in the database. */
  recoverOnStartup(): Promise<void>

  /** Get the count of pending permissions. */
  readonly pendingCount: number
}
