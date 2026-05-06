'use client'

import { mutate as globalMutate } from 'swr'

import { useGetCreditBalance } from './use-get-credit-balance'
import { useGetCreditTransactions } from './use-get-credit-transactions'
export type { CreditTransaction } from './use-get-credit-transactions'

// SWR key used by useGetCreditBalance (path + empty params)
const BALANCE_SWR_KEY = ['/api/billing/balance', '{}']
const TRANSACTIONS_SWR_KEY_PREFIX = '/api/billing/transactions'

export function useCredits() {
  const { data, loading, error, mutate } = useGetCreditBalance()

  return {
    balance: data,
    balanceCents: data?.balance_cents || 0,
    balanceUSD: data?.balance_usd || 0,
    loading,
    error,
    refresh: mutate,
  }
}

export function useCreditTransactions(limit = 50) {
  const { data, loading, error, mutate } = useGetCreditTransactions(limit)
  return {
    transactions: data ?? [],
    loading,
    error,
    refresh: mutate,
  }
}

export function updateBalanceFromEvent(remainingBalanceCents: number): void {
  globalMutate(
    BALANCE_SWR_KEY,
    {
      balance_cents: remainingBalanceCents,
      balance_usd: remainingBalanceCents / 100,
    },
    false,
  )
}

export function refreshBillingData(): void {
  globalMutate(BALANCE_SWR_KEY)
  globalMutate(
    (key: unknown) =>
      Array.isArray(key) &&
      typeof key[0] === 'string' &&
      key[0] === TRANSACTIONS_SWR_KEY_PREFIX,
  )
}
