'use client'

import { useAuthPostLazarusApi } from '@/hooks/data/use-lazarus-api'

type CheckoutBody = {
  amount_usd: number
  team_id?: string
}

type CheckoutResponse = {
  url: string
}

export const useCreateCheckoutSession = () =>
  useAuthPostLazarusApi<CheckoutResponse, CheckoutBody>({
    path: '/api/billing/checkout',
  })
