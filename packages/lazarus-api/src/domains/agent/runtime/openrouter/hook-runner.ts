import { createLogger } from '@utils/logger'

const log = createLogger('openrouter-hook-runner')

export interface THookMatcher {
  matcher?: string
  hooks: Array<
    (
      input: { tool_name: string; tool_input: Record<string, unknown> },
      toolUseId: string | undefined,
      options: { signal: AbortSignal },
    ) => Promise<unknown>
  >
  timeout?: number
}

export interface THookDecision {
  decision: 'allow' | 'deny'
  reason?: string
}

function matcherAccepts(pattern: string | undefined, toolName: string): boolean {
  if (!pattern) return true
  try {
    return new RegExp(pattern).test(toolName)
  } catch {
    return pattern === toolName
  }
}

function extractDecision(raw: unknown): THookDecision | null {
  if (!raw || typeof raw !== 'object') return null
  const out = raw as {
    decision?: string
    reason?: string
    hookSpecificOutput?: {
      hookEventName?: string
      permissionDecision?: string
      permissionDecisionReason?: string
    }
  }
  const hs = out.hookSpecificOutput
  if (hs?.permissionDecision === 'deny') {
    return { decision: 'deny', reason: hs.permissionDecisionReason ?? 'denied by hook' }
  }
  if (hs?.permissionDecision === 'allow') {
    return { decision: 'allow' }
  }
  if (out.decision === 'block') {
    return { decision: 'deny', reason: out.reason ?? 'blocked by hook' }
  }
  if (out.decision === 'approve') {
    return { decision: 'allow' }
  }
  return null
}

export class HookRunner {
  constructor(private readonly matchers: THookMatcher[] = []) {}

  async preToolUse(
    toolName: string,
    toolInput: Record<string, unknown>,
    toolUseId: string,
    signal: AbortSignal,
  ): Promise<THookDecision> {
    for (const matcher of this.matchers) {
      if (!matcherAccepts(matcher.matcher, toolName)) continue
      for (const hook of matcher.hooks) {
        try {
          const result = await hook({ tool_name: toolName, tool_input: toolInput }, toolUseId, {
            signal,
          })
          const decision = extractDecision(result)
          if (decision?.decision === 'deny') return decision
        } catch (err) {
          log.error({ err, toolName }, 'PreToolUse hook threw; treating as deny')
          return { decision: 'deny', reason: `hook error: ${(err as Error).message}` }
        }
      }
    }
    return { decision: 'allow' }
  }
}
