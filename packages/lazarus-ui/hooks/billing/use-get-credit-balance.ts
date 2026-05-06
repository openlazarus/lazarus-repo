'use client'

import { useAuthGetLazarusApi } from '@/hooks/data/use-lazarus-api'

type CreditBalance = {
  balance_cents: number
  balance_usd: number
}

export const useGetCreditBalance = () =>
  useAuthGetLazarusApi<CreditBalance>({ path: '/api/billing/balance' })
