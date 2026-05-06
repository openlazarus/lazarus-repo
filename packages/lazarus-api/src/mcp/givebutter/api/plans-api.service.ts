import { IGivebutterPlansApi } from './plans-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import { TGivebutterPlan, TListParams, TPaginated } from '@mcp/givebutter/types/givebutter.types'

export class GivebutterPlansApi implements IGivebutterPlansApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listPlans(params?: TListParams): Promise<TPaginated<TGivebutterPlan>> {
    return this.http.get<TPaginated<TGivebutterPlan>>(
      '/v1/plans',
      params as Record<string, unknown>,
    )
  }

  getPlan(id: string): Promise<TGivebutterPlan> {
    return this.http.get<TGivebutterPlan>(`/v1/plans/${id}`)
  }
}
