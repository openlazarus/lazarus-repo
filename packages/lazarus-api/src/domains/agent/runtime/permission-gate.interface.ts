/**
 * Neutral permission contract — what each runtime calls before a tool actually runs.
 *
 * Today, guardrail logic + risk assessment live inside the Anthropic SDK
 * `PreToolUse` hook in `workspace-agent-executor.ts`. The Claude runtime keeps
 * using that hook (the gate is wired into the hook body). A future OpenAI
 * runtime calls `gate.check(toolName, input)` directly inside its
 * function-calling loop.
 *
 * Decisions:
 *   - `'allow'` — proceed.
 *   - `'deny'` — refuse the call. Caller must surface a denial result.
 *   - `'ask'`  — needs human approval via a channel (WhatsApp/Discord/Slack/web).
 *                The caller is expected to await the resolution (`waitForApproval`).
 *                The current Claude code returns 'allow' or 'deny' only (it resolves
 *                inside the hook), so 'ask' is reserved for the OpenAI loop.
 */

export type TPermissionDecision = 'allow' | 'deny' | 'ask'

export type TPermissionCheckInput = {
  toolName: string
  input: Record<string, unknown>
}

export interface IPermissionGate {
  /** Quick check: should this tool call proceed, be denied, or escalated to a human? */
  check(input: TPermissionCheckInput): Promise<TPermissionDecision>

  /**
   * Used by runtimes that handle `ask` themselves (e.g. OpenAI's manual loop).
   * Blocks until a human resolves the approval via any configured channel.
   * Returns `true` if approved, `false` if rejected.
   * Implementations may persist the request and resolve via the existing
   * `BackgroundPermissionManager` flow.
   */
  waitForApproval(input: TPermissionCheckInput): Promise<boolean>
}
