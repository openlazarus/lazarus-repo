import {
  TCreateCampaignInput,
  TGivebutterCampaign,
  TGivebutterCampaignMember,
  TListParams,
  TPaginated,
  TUpdateCampaignInput,
} from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterCampaignsApi {
  listCampaigns(params?: TListParams): Promise<TPaginated<TGivebutterCampaign>>
  getCampaign(id: number): Promise<TGivebutterCampaign>
  createCampaign(input: TCreateCampaignInput): Promise<TGivebutterCampaign>
  updateCampaign(id: number, input: TUpdateCampaignInput): Promise<TGivebutterCampaign>
  archiveCampaign(id: number): Promise<void>
  listCampaignMembers(
    id: number,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterCampaignMember>>
  getCampaignMember(campaignId: number, memberId: number): Promise<TGivebutterCampaignMember>
  deleteCampaignMember(campaignId: number, memberId: number): Promise<void>
}
