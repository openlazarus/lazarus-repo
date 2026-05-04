export const TRACER_NAME = 'lazarus-agent-runtime'

export const SPAN_NAMES = {
  agentRun: 'agent.run',
  toolCall: 'agent.tool_call',
  approvalWait: 'agent.approval_wait',
  creditsCheck: 'credits.check',
} as const

export const SPAN_ATTRS = {
  workspaceId: 'lazarus.workspace_id',
  agentId: 'lazarus.agent_id',
  sessionId: 'lazarus.session_id',
  executionId: 'lazarus.execution_id',
  runtime: 'lazarus.runtime',
  title: 'lazarus.title',
  triggeredBy: 'lazarus.triggered_by',
  platformSource: 'lazarus.platform_source',
  costUsd: 'lazarus.cost_usd',
  toolUseId: 'lazarus.tool_use_id',
  toolInput: 'lazarus.tool_input',
  toolOutput: 'lazarus.tool_output',
  toolIsError: 'lazarus.tool_is_error',

  creditsAllowed: 'lazarus.credits.allowed',
  creditsChannel: 'lazarus.credits.channel',

  genAiSystem: 'gen_ai.system',
  genAiRequestModel: 'gen_ai.request.model',
  genAiToolName: 'gen_ai.tool.name',
  genAiUsageInputTokens: 'gen_ai.usage.input_tokens',
  genAiUsageOutputTokens: 'gen_ai.usage.output_tokens',
  genAiUsageCacheReadTokens: 'gen_ai.usage.cache_read_input_tokens',
  genAiUsageCacheCreateTokens: 'gen_ai.usage.cache_creation_input_tokens',
} as const

export const SPAN_EVENTS = {
  systemInit: 'system.init',
  assistantText: 'assistant.text',
  assistantThinking: 'assistant.thinking',
  userMessage: 'user.message',
  toolProgress: 'tool.progress',
  statusChange: 'status.change',
  approvalRequested: 'approval.requested',
  approvalResolved: 'approval.resolved',
  sandboxViolation: 'sandbox.violation',
} as const
