import {
  TCreateDiscountCodeInput,
  TGivebutterDiscountCode,
  TListParams,
  TPaginated,
  TUpdateDiscountCodeInput,
} from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterCampaignDiscountCodesApi {
  listDiscountCodes(
    campaignId: number,
    params?: TListParams,
  ): Promise<TPaginated<TGivebutterDiscountCode>>
  getDiscountCode(campaignId: number, codeId: number): Promise<TGivebutterDiscountCode>
  createDiscountCode(
    campaignId: number,
    input: TCreateDiscountCodeInput,
  ): Promise<TGivebutterDiscountCode>
  updateDiscountCode(
    campaignId: number,
    codeId: number,
    input: TUpdateDiscountCodeInput,
  ): Promise<TGivebutterDiscountCode>
  deleteDiscountCode(campaignId: number, codeId: number): Promise<void>
}
