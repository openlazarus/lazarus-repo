import { IGivebutterCampaignDiscountCodesApi } from './campaign-discount-codes-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import {
  TCreateDiscountCodeInput,
  TGivebutterDiscountCode,
  TListParams,
  TPaginated,
  TUpdateDiscountCodeInput,
} from '@mcp/givebutter/types/givebutter.types'

export class GivebutterCampaignDiscountCodesApi implements IGivebutterCampaignDiscountCodesApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listDiscountCodes(
    campaignId: number,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterDiscountCode>> {
    return this.http.get<TPaginated<TGivebutterDiscountCode>>(
      `/v1/campaigns/${campaignId}/discount-codes`,
      params as Record<string, unknown>,
    )
  }

  getDiscountCode(campaignId: number, codeId: number): Promise<TGivebutterDiscountCode> {
    return this.http.get<TGivebutterDiscountCode>(
      `/v1/campaigns/${campaignId}/discount-codes/${codeId}`,
    )
  }

  createDiscountCode(
    campaignId: number,
    input: TCreateDiscountCodeInput,
  ): Promise<TGivebutterDiscountCode> {
    return this.http.post<TGivebutterDiscountCode>(
      `/v1/campaigns/${campaignId}/discount-codes`,
      input,
    )
  }

  updateDiscountCode(
    campaignId: number,
    codeId: number,
    input: TUpdateDiscountCodeInput,
  ): Promise<TGivebutterDiscountCode> {
    return this.http.put<TGivebutterDiscountCode>(
      `/v1/campaigns/${campaignId}/discount-codes/${codeId}`,
      input,
    )
  }

  deleteDiscountCode(campaignId: number, codeId: number): Promise<void> {
    return this.http.delete<void>(`/v1/campaigns/${campaignId}/discount-codes/${codeId}`)
  }
}
