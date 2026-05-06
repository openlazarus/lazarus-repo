import {
  TCreateFundInput,
  TGivebutterFund,
  TListParams,
  TPaginated,
  TUpdateFundInput,
} from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterFundsApi {
  listFunds(params?: TListParams): Promise<TPaginated<TGivebutterFund>>
  getFund(id: string): Promise<TGivebutterFund>
  createFund(input: TCreateFundInput): Promise<TGivebutterFund>
  updateFund(id: string, input: TUpdateFundInput): Promise<TGivebutterFund>
  archiveFund(id: string): Promise<void>
}
