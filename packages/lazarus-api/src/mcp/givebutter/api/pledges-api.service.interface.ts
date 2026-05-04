import { TGivebutterPledge, TListParams, TPaginated } from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterPledgesApi {
  listPledges(params?: TListParams): Promise<TPaginated<TGivebutterPledge>>
  getPledge(id: number): Promise<TGivebutterPledge>
}
