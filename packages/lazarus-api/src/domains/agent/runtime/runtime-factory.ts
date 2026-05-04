import { RuntimeTracer } from '@observability/runtime-tracer'
import type { IAgentRuntime } from './agent-runtime.interface'
import type { TAgentRuntimeKind } from './agent-runtime.types'
import { ClaudeSdkRuntime } from './claude-sdk-runtime'
import { OpenrouterRuntime } from './openrouter/openrouter-runtime'

const registry: Record<TAgentRuntimeKind, () => IAgentRuntime> = {
  'claude-sdk': () => new ClaudeSdkRuntime(),
  openrouter: () => {
    if (!process.env.OPENROUTER_API_KEY) {
      return new ClaudeSdkRuntime()
    }
    return new OpenrouterRuntime()
  },
}

export function getAgentRuntime(kind: TAgentRuntimeKind = 'claude-sdk'): IAgentRuntime {
  const factory = registry[kind] ?? registry['claude-sdk']
  return new RuntimeTracer(factory())
}
