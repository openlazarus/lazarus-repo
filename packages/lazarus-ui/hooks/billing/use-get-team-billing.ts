'use client'

import { useAuthGetLazarusApi } from '@/hooks/data/use-lazarus-api'

import type { BillingAccount } from './use-team-billing'

export const useGetTeamBilling = (teamId: string) =>
  useAuthGetLazarusApi<{
    success: boolean
    billingAccount: BillingAccount | null
  }>({
    path: `/api/billing/teams/${teamId}`,
    enabled: !!teamId,
  })
