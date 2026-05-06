import { supabase } from '@infrastructure/database/supabase'
import { createLogger } from '@utils/logger'
import type { IAgentRunRepository } from './agent-run.repository.interface'
import type {
  TAgentRunInsert,
  TAgentRunListOptions,
  TAgentRunRow,
  TAgentRunUpdate,
} from './agent-run.types'

const log = createLogger('agent-run-repository')

class AgentRunRepository implements IAgentRunRepository {
  async upsert(row: TAgentRunInsert): Promise<void> {
    const { error } = await supabase
      .from('agent_runs')
      .upsert(row as never, { onConflict: 'trace_id' })
    if (error) {
      log.error({ err: error, traceId: row.trace_id }, 'upsert agent_runs failed')
      throw error
    }
  }

  async update(traceId: string, patch: TAgentRunUpdate): Promise<void> {
    const { error } = await supabase
      .from('agent_runs')
      .update(patch as never)
      .eq('trace_id', traceId)
    if (error) {
      log.error({ err: error, traceId }, 'update agent_runs failed')
      throw error
    }
  }

  async getByTraceId(traceId: string): Promise<TAgentRunRow | null> {
    const { data, error } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('trace_id', traceId)
      .maybeSingle()
    if (error) {
      log.error({ err: error, traceId }, 'get agent_runs failed')
      return null
    }
    return (data as unknown as TAgentRunRow) ?? null
  }

  async list(options: TAgentRunListOptions): Promise<TAgentRunRow[]> {
    let query = supabase
      .from('agent_runs')
      .select('*')
      .eq('workspace_id', options.workspaceId)
      .order('started_at', { ascending: false })
      .limit(options.limit ?? 50)
    if (options.status) query = query.eq('status', options.status)
    if (options.before) query = query.lt('started_at', options.before)
    const { data, error } = await query
    if (error) {
      log.error({ err: error, workspaceId: options.workspaceId }, 'list agent_runs failed')
      return []
    }
    return (data as unknown as TAgentRunRow[]) ?? []
  }

  async countByDay(
    workspaceId: string,
    fromIso: string,
    toIso: string,
  ): Promise<Array<{ day: string; count: number }>> {
    const { data, error } = await supabase
      .from('agent_runs')
      .select('started_at')
      .eq('workspace_id', workspaceId)
      .gte('started_at', fromIso)
      .lt('started_at', toIso)
    if (error) {
      log.error({ err: error, workspaceId }, 'countByDay select failed')
      return []
    }
    const buckets = new Map<string, number>()
    for (const row of (data as Array<{ started_at: string }>) ?? []) {
      const day = row.started_at.slice(0, 10)
      buckets.set(day, (buckets.get(day) ?? 0) + 1)
    }
    return Array.from(buckets.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => (a.day < b.day ? -1 : 1))
  }
}

export const agentRunRepository: IAgentRunRepository = new AgentRunRepository()
