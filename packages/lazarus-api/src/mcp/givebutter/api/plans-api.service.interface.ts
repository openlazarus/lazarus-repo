import { TGivebutterPlan, TListParams, TPaginated } from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterPlansApi {
  listPlans(params?: TListParams): Promise<TPaginated<TGivebutterPlan>>
  getPlan(id: string): Promise<TGivebutterPlan>
}
