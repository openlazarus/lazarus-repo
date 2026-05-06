import {
  TGivebutterCampaignTeam,
  TListParams,
  TPaginated,
} from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterCampaignTeamsApi {
  listCampaignTeams(
    campaignId: number,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterCampaignTeam>>
  getCampaignTeam(campaignId: number, teamId: number): Promise<TGivebutterCampaignTeam>
  deleteCampaignTeam(campaignId: number, teamId: number): Promise<void>
}
