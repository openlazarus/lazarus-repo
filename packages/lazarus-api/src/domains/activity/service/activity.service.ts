/**
 * ActivityService factory. Returns a span-backed implementation reading from
 * agent_runs/agent_spans in Postgres. Write methods are no-ops — the OTel
 * runtime tracer + ActivityStoreSpanProcessor own the write path.
 */

import type { IActivityService } from './activity.service.interface'
import { SpanActivityService } from './span-activity.service'

let instance: IActivityService | null = null

export function getActivityService(): IActivityService {
  if (!instance) instance = new SpanActivityService()
  return instance
}
