'use client'

import { useMemo } from 'react'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'
import type { PhoneStatusInfo } from '@/model'

type WhatsAppResponse = {
  whatsapp: {
    phoneNumber?: string
    status: string
    phoneStatus?: PhoneStatusInfo
  } | null
}

export function useWhatsAppConfig(workspaceId: string, agentId: string) {
  const { data, loading, error, mutate } = useAuthGetWorkspaceApi<WhatsAppResponse>({
    path: `/api/workspaces/agents/${agentId}/whatsapp`,
    params: { workspaceId },
    enabled: !!workspaceId && !!agentId,
  })

  return useMemo(() => {
    const whatsapp = data?.whatsapp
    return {
      phoneNumber: whatsapp?.phoneNumber ?? null,
      status: whatsapp?.status ?? null,
      phoneStatus: whatsapp?.phoneStatus,
      loading,
      error,
      mutate,
    }
  }, [data, loading, error, mutate])
}
