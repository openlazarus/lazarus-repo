'use client'

import { useAuthGetLazarusApi } from '@/hooks/data/use-lazarus-api'

import type { CreditTransaction } from './use-team-billing'

export const useGetBillingTransactions = (billingAccountId: string) =>
  useAuthGetLazarusApi<{ success: boolean; transactions: CreditTransaction[] }>(
    {
      path: `/api/billing/accounts/${billingAccountId}/transactions`,
      enabled: !!billingAccountId,
    },
  )
