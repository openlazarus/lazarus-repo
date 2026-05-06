import { IGivebutterTicketsApi } from './tickets-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import { TGivebutterTicket, TListParams, TPaginated } from '@mcp/givebutter/types/givebutter.types'

export class GivebutterTicketsApi implements IGivebutterTicketsApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listTickets(params?: TListParams): Promise<TPaginated<TGivebutterTicket>> {
    return this.http.get<TPaginated<TGivebutterTicket>>(
      '/v1/tickets',
      params as Record<string, unknown>,
    )
  }

  getTicket(id: number): Promise<TGivebutterTicket> {
    return this.http.get<TGivebutterTicket>(`/v1/tickets/${id}`)
  }
}
