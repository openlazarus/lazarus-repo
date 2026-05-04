import type WebSocket from 'ws'

export interface IFileWatcherService {
  /** Subscribe a WebSocket client to workspace file changes. */
  subscribe(workspaceId: string, userId: string, ws: WebSocket): void

  /** Unsubscribe a WebSocket client from workspace file changes. */
  unsubscribe(workspaceId: string, userId: string, ws: WebSocket): void

  /** Manually trigger a file change notification. */
  notifyFileChange(
    workspaceId: string,
    userId: string,
    filePath: string,
    type: 'file:created' | 'file:modified' | 'file:deleted',
  ): void

  /** Get the number of active subscriptions. */
  getSubscriptionCount(): number

  /** Clean up all watchers and subscriptions. */
  cleanup(): Promise<void>
}
