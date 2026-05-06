import type { TAgentRunRequest, TAgentRuntimeMessage } from './agent-runtime.types'

export interface IAgentRuntime {
  run(request: TAgentRunRequest): AsyncIterable<TAgentRuntimeMessage>
}
