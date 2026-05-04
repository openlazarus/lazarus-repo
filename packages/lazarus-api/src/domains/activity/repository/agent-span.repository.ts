import { supabase } from '@infrastructure/database/supabase'
import { createLogger } from '@utils/logger'
import type { IAgentSpanRepository } from './agent-span.repository.interface'
import type { TAgentSpanInsert, TAgentSpanRow } from './agent-span.types'

const log = createLogger('agent-span-repository')

class AgentSpanRepository implements IAgentSpanRepository {
  async upsertMany(rows: TAgentSpanInsert[]): Promise<void> {
    if (rows.length === 0) return
    const { error } = await supabase
      .from('agent_spans')
      .upsert(rows as never, { onConflict: 'span_id' })
    if (error) {
      log.error({ err: error, count: rows.length }, 'upsert agent_spans failed')
      throw error
    }
  }

  async listByTrace(traceId: string): Promise<TAgentSpanRow[]> {
    const { data, error } = await supabase
      .from('agent_spans')
      .select('*')
      .eq('trace_id', traceId)
      .order('started_at', { ascending: true })
    if (error) {
      log.error({ err: error, traceId }, 'list agent_spans failed')
      return []
    }
    return (data as unknown as TAgentSpanRow[]) ?? []
  }
}

export const agentSpanRepository: IAgentSpanRepository = new AgentSpanRepository()
