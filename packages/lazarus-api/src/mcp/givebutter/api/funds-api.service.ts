import { IGivebutterFundsApi } from './funds-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import {
  TCreateFundInput,
  TGivebutterFund,
  TListParams,
  TPaginated,
  TUpdateFundInput,
} from '@mcp/givebutter/types/givebutter.types'

export class GivebutterFundsApi implements IGivebutterFundsApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listFunds(params?: TListParams): Promise<TPaginated<TGivebutterFund>> {
    return this.http.get<TPaginated<TGivebutterFund>>(
      '/v1/funds',
      params as Record<string, unknown>,
    )
  }

  getFund(id: string): Promise<TGivebutterFund> {
    return this.http.get<TGivebutterFund>(`/v1/funds/${id}`)
  }

  createFund(input: TCreateFundInput): Promise<TGivebutterFund> {
    return this.http.post<TGivebutterFund>('/v1/funds', input)
  }

  updateFund(id: string, input: TUpdateFundInput): Promise<TGivebutterFund> {
    return this.http.put<TGivebutterFund>(`/v1/funds/${id}`, input)
  }

  archiveFund(id: string): Promise<void> {
    return this.http.delete<void>(`/v1/funds/${id}`)
  }
}
