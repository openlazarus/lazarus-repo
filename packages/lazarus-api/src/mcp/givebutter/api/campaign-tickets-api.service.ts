import { IGivebutterCampaignTicketsApi } from './campaign-tickets-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import {
  TCreateCampaignTicketInput,
  TGivebutterCampaignTicket,
  TListParams,
  TPaginated,
} from '@mcp/givebutter/types/givebutter.types'

export class GivebutterCampaignTicketsApi implements IGivebutterCampaignTicketsApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listCampaignTickets(
    campaignId: number,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterCampaignTicket>> {
    return this.http.get<TPaginated<TGivebutterCampaignTicket>>(
      `/v1/campaigns/${campaignId}/items/tickets`,
      params as Record<string, unknown>,
    )
  }

  getCampaignTicket(campaignId: number, ticketId: number): Promise<TGivebutterCampaignTicket> {
    return this.http.get<TGivebutterCampaignTicket>(
      `/v1/campaigns/${campaignId}/items/tickets/${ticketId}`,
    )
  }

  createCampaignTicket(
    campaignId: number,
    input: TCreateCampaignTicketInput,
  ): Promise<TGivebutterCampaignTicket> {
    return this.http.post<TGivebutterCampaignTicket>(
      `/v1/campaigns/${campaignId}/items/tickets`,
      input,
    )
  }
}
