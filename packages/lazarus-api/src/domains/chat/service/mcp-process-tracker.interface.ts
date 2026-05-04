/**
 * Interface for tracking and cleaning up MCP child processes
 * spawned during chat or agent sessions.
 */
export interface IMcpProcessTracker {
  /** Generate a unique session tag for tracking spawned processes. */
  generateTag(): string

  /** Kill all child processes tagged with the given session tag. Returns count killed. */
  cleanup(sessionTag: string): number
}
