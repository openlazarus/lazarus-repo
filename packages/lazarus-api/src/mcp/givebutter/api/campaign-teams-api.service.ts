import { IGivebutterCampaignTeamsApi } from './campaign-teams-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import {
  TGivebutterCampaignTeam,
  TListParams,
  TPaginated,
} from '@mcp/givebutter/types/givebutter.types'

export class GivebutterCampaignTeamsApi implements IGivebutterCampaignTeamsApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listCampaignTeams(
    campaignId: number,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterCampaignTeam>> {
    return this.http.get<TPaginated<TGivebutterCampaignTeam>>(
      `/v1/campaigns/${campaignId}/teams`,
      params as Record<string, unknown>,
    )
  }

  getCampaignTeam(campaignId: number, teamId: number): Promise<TGivebutterCampaignTeam> {
    return this.http.get<TGivebutterCampaignTeam>(`/v1/campaigns/${campaignId}/teams/${teamId}`)
  }

  deleteCampaignTeam(campaignId: number, teamId: number): Promise<void> {
    return this.http.delete<void>(`/v1/campaigns/${campaignId}/teams/${teamId}`)
  }
}
