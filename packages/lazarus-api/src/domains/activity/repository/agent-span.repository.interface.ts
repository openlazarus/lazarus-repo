import type { TAgentSpanInsert, TAgentSpanRow } from './agent-span.types'

export interface IAgentSpanRepository {
  upsertMany(rows: TAgentSpanInsert[]): Promise<void>
  listByTrace(traceId: string): Promise<TAgentSpanRow[]>
}
