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
  const { data, loading, error } = useAuthGetWorkspaceApi<WhatsAppResponse>({
    path: `/api/workspaces/agents/${agentId}/whatsapp`,
    params: { workspaceId },
    enabled: !!workspaceId && !!agentId,
  })

  return useMemo(() => {
    const whatsapp = data?.whatsapp
    const isConnected =
      whatsapp?.status === 'connected' && !!whatsapp.phoneNumber
    return {
      phoneNumber: isConnected ? whatsapp!.phoneNumber! : null,
      phoneStatus: isConnected ? whatsapp!.phoneStatus : undefined,
      loading,
      error,
    }
  }, [data, loading, error])
}
