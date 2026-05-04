import type {
  TAgentRunInsert,
  TAgentRunListOptions,
  TAgentRunRow,
  TAgentRunUpdate,
} from './agent-run.types'

export interface IAgentRunRepository {
  upsert(row: TAgentRunInsert): Promise<void>
  update(traceId: string, patch: TAgentRunUpdate): Promise<void>
  getByTraceId(traceId: string): Promise<TAgentRunRow | null>
  list(options: TAgentRunListOptions): Promise<TAgentRunRow[]>
  countByDay(
    workspaceId: string,
    fromIso: string,
    toIso: string,
  ): Promise<Array<{ day: string; count: number }>>
}
