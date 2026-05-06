import { IGivebutterPayoutsApi } from './payouts-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import { TGivebutterPayout, TListParams, TPaginated } from '@mcp/givebutter/types/givebutter.types'

export class GivebutterPayoutsApi implements IGivebutterPayoutsApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listPayouts(params?: TListParams): Promise<TPaginated<TGivebutterPayout>> {
    return this.http.get<TPaginated<TGivebutterPayout>>(
      '/v1/payouts',
      params as Record<string, unknown>,
    )
  }

  getPayout(id: string): Promise<TGivebutterPayout> {
    return this.http.get<TGivebutterPayout>(`/v1/payouts/${id}`)
  }
}
