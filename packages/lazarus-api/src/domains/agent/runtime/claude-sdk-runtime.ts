import { query } from '@anthropic-ai/claude-agent-sdk'
import type { IAgentRuntime } from './agent-runtime.interface'
import type { TAgentRunRequest, TAgentRuntimeMessage } from './agent-runtime.types'

export class ClaudeSdkRuntime implements IAgentRuntime {
  run(request: TAgentRunRequest): AsyncIterable<TAgentRuntimeMessage> {
    return query({ prompt: request.prompt, options: request.options })
  }
}
