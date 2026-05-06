'use client'

import { useAuthGetLazarusApi } from '@/hooks/data/use-lazarus-api'

import type { TeamWithBilling } from './use-team-billing'

export const useGetTeamsBilling = () =>
  useAuthGetLazarusApi<{ success: boolean; teams: TeamWithBilling[] }>({
    path: '/api/billing/teams',
  })
