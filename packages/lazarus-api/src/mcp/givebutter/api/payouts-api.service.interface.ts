import { TGivebutterPayout, TListParams, TPaginated } from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterPayoutsApi {
  listPayouts(params?: TListParams): Promise<TPaginated<TGivebutterPayout>>
  getPayout(id: string): Promise<TGivebutterPayout>
}
