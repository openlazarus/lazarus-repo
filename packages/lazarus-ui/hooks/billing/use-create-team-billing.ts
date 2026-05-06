'use client'

import { useAuthPostLazarusApi } from '@/hooks/data/use-lazarus-api'

import type { BillingAccount } from './use-team-billing'

export const useCreateTeamBilling = (teamId: string) =>
  useAuthPostLazarusApi<{ billingAccount: BillingAccount }>({
    path: `/api/billing/teams/${teamId}`,
  })
