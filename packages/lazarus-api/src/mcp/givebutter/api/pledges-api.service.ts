import { IGivebutterPledgesApi } from './pledges-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import { TGivebutterPledge, TListParams, TPaginated } from '@mcp/givebutter/types/givebutter.types'

export class GivebutterPledgesApi implements IGivebutterPledgesApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listPledges(params?: TListParams): Promise<TPaginated<TGivebutterPledge>> {
    return this.http.get<TPaginated<TGivebutterPledge>>(
      '/v1/pledges',
      params as Record<string, unknown>,
    )
  }

  getPledge(id: number): Promise<TGivebutterPledge> {
    return this.http.get<TGivebutterPledge>(`/v1/pledges/${id}`)
  }
}
