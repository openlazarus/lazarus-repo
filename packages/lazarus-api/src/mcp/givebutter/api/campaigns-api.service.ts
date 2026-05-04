import { IGivebutterCampaignsApi } from './campaigns-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import {
  TCreateCampaignInput,
  TGivebutterCampaign,
  TGivebutterCampaignMember,
  TListParams,
  TPaginated,
  TUpdateCampaignInput,
} from '@mcp/givebutter/types/givebutter.types'

export class GivebutterCampaignsApi implements IGivebutterCampaignsApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listCampaigns(params?: TListParams): Promise<TPaginated<TGivebutterCampaign>> {
    return this.http.get<TPaginated<TGivebutterCampaign>>(
      '/v1/campaigns',
      params as Record<string, unknown>,
    )
  }

  getCampaign(id: number): Promise<TGivebutterCampaign> {
    return this.http.get<TGivebutterCampaign>(`/v1/campaigns/${id}`)
  }

  createCampaign(input: TCreateCampaignInput): Promise<TGivebutterCampaign> {
    return this.http.post<TGivebutterCampaign>('/v1/campaigns', input)
  }

  updateCampaign(id: number, input: TUpdateCampaignInput): Promise<TGivebutterCampaign> {
    return this.http.put<TGivebutterCampaign>(`/v1/campaigns/${id}`, input)
  }

  archiveCampaign(id: number): Promise<void> {
    return this.http.delete<void>(`/v1/campaigns/${id}`)
  }

  listCampaignMembers(
    id: number,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterCampaignMember>> {
    return this.http.get<TPaginated<TGivebutterCampaignMember>>(
      `/v1/campaigns/${id}/members`,
      params as Record<string, unknown>,
    )
  }

  getCampaignMember(campaignId: number, memberId: number): Promise<TGivebutterCampaignMember> {
    return this.http.get<TGivebutterCampaignMember>(
      `/v1/campaigns/${campaignId}/members/${memberId}`,
    )
  }

  deleteCampaignMember(campaignId: number, memberId: number): Promise<void> {
    return this.http.delete<void>(`/v1/campaigns/${campaignId}/members/${memberId}`)
  }
}
