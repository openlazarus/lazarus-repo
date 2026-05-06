import {
  TCreateCampaignTicketInput,
  TGivebutterCampaignTicket,
  TListParams,
  TPaginated,
} from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterCampaignTicketsApi {
  listCampaignTickets(
    campaignId: number,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterCampaignTicket>>
  getCampaignTicket(campaignId: number, ticketId: number): Promise<TGivebutterCampaignTicket>
  createCampaignTicket(
    campaignId: number,
    input: TCreateCampaignTicketInput,
  ): Promise<TGivebutterCampaignTicket>
}
