import { TGivebutterTicket, TListParams, TPaginated } from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterTicketsApi {
  listTickets(params?: TListParams): Promise<TPaginated<TGivebutterTicket>>
  getTicket(id: number): Promise<TGivebutterTicket>
}
