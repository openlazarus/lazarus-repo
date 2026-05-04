import {
  TCreateTransactionInput,
  TGivebutterTransaction,
  TListParams,
  TPaginated,
  TUpdateTransactionInput,
} from '@mcp/givebutter/types/givebutter.types'

export interface IGivebutterTransactionsApi {
  listTransactions(params?: TListParams): Promise<TPaginated<TGivebutterTransaction>>
  getTransaction(id: string): Promise<TGivebutterTransaction>
  createTransaction(input: TCreateTransactionInput): Promise<TGivebutterTransaction>
  updateTransaction(id: string, input: TUpdateTransactionInput): Promise<TGivebutterTransaction>
}
