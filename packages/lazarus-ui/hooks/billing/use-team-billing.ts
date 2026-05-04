'use client'

import { useGetBillingTransactions } from './use-get-billing-transactions'
import { useGetTeamBilling } from './use-get-team-billing'
import { useGetTeamsBilling } from './use-get-teams-billing'

export type BillingAccount = {
  id: string
  team_id: string
  credit_balance_cents: number
  stripe_customer_id?: string
  created_at: string
  updated_at: string
}

export type Team = {
  id: string
  name: string
  slug: string
  ownerId: string
}

export type TeamWithBilling = {
  team: Team
  role: string
  billingAccount: BillingAccount | null
}

export type CreditTransaction = {
  id: string
  billingAccountId: string
  userId: string
  amountCents: number
  type: 'purchase' | 'usage' | 'refund' | 'adjustment'
  description: string
  metadata?: Record<string, any>
  createdAt: string
}

export function useTeamsBilling() {
  const { data, loading: isLoading, error, mutate } = useGetTeamsBilling()
  return {
    teams: data?.teams ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useTeamBilling(teamId: string | null) {
  const {
    data,
    loading: isLoading,
    error,
    mutate,
  } = useGetTeamBilling(teamId ?? '')
  return {
    billingAccount: data?.billingAccount ?? null,
    isLoading,
    error,
    mutate,
  }
}

export function useTeamCreditTransactions(billingAccountId: string | null) {
  const {
    data,
    loading: isLoading,
    error,
    mutate,
  } = useGetBillingTransactions(billingAccountId ?? '')
  return {
    transactions: data?.transactions ?? [],
    isLoading,
    error,
    mutate,
  }
}
