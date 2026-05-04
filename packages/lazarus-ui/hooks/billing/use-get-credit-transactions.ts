'use client'

import { useAuthGetLazarusApi } from '@/hooks/data/use-lazarus-api'

export interface CreditTransaction {
  id: string
  billing_account_id: string
  amount_cents: number
  balance_after_cents: number
  transaction_type: string
  stripe_payment_intent_id?: string
  purchase_method?: string
  consumed_by_agent_id?: string
  consumed_by_user_id?: string
  activity_type?: string
  activity_reference_id?: string
  activity_reference_type?: string
  workspace_id?: string
  description?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export const useGetCreditTransactions = (limit = 50) =>
  useAuthGetLazarusApi<CreditTransaction[]>({
    path: '/api/billing/transactions',
    params: { limit },
  })
