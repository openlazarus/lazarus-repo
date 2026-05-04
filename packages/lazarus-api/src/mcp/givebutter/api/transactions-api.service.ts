import { IGivebutterTransactionsApi } from './transactions-api.service.interface'
import { IGivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client.interface'
import {
  TCreateTransactionInput,
  TGivebutterTransaction,
  TListParams,
  TPaginated,
  TUpdateTransactionInput,
} from '@mcp/givebutter/types/givebutter.types'

export class GivebutterTransactionsApi implements IGivebutterTransactionsApi {
  constructor(private readonly http: IGivebutterHttpClient) {}

  listTransactions(params?: TListParams): Promise<TPaginated<TGivebutterTransaction>> {
    return this.http.get<TPaginated<TGivebutterTransaction>>(
      '/v1/transactions',
      params as Record<string, unknown>,
    )
  }

  getTransaction(id: string): Promise<TGivebutterTransaction> {
    return this.http.get<TGivebutterTransaction>(`/v1/transactions/${id}`)
  }

  createTransaction(input: TCreateTransactionInput): Promise<TGivebutterTransaction> {
    return this.http.post<TGivebutterTransaction>('/v1/transactions', input)
  }

  updateTransaction(id: string, input: TUpdateTransactionInput): Promise<TGivebutterTransaction> {
    return this.http.put<TGivebutterTransaction>(`/v1/transactions/${id}`, input)
  }
}
