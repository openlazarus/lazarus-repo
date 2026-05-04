import { useMemo } from 'react'

import { api } from '@/lib/api-client'

export interface V0Chat {
  id: string
  demo?: string
  latestVersion?: {
    id: string
    files: Array<{
      name: string
      lang: string
      url: string
      content?: string
      locked?: boolean
    }>
  }
  updatedAt?: string
}

export interface V0Deployment {
  id: string
  url?: string
  deploymentUrl?: string
  status: string
  createdAt: string
}

export interface V0EnvVar {
  id?: string
  key?: string
  name?: string
  value?: string
}

export interface V0DeploymentLog {
  message?: string
  timestamp?: string
}

export function useV0Api() {
  return useMemo(
    () => ({
      getChat: async (chatId: string): Promise<V0Chat> => {
        const data = await api.get(`/api/v0/chat/${chatId}`)
        return data.chat
      },

      findDeployments: async (params: {
        projectId: string
        chatId: string
        versionId: string
      }): Promise<V0Deployment[]> => {
        const data = await api.get(`/api/v0/deployments`, { params })
        return data.deployments || []
      },

      findEnvVars: async (params: {
        projectId: string
        decrypted?: boolean
      }): Promise<V0EnvVar[]> => {
        const data = await api.get(`/api/v0/manage-env-vars`, { params })
        return data.envVars || []
      },

      findDeploymentLogs: async (params: {
        projectId: string
        chatId: string
        deploymentId: string
      }): Promise<V0DeploymentLog[]> => {
        const data = await api.get(
          `/api/v0/deployment-logs/${params.deploymentId}`,
          {
            params: {
              projectId: params.projectId,
              chatId: params.chatId,
            },
          },
        )
        return data.logs || []
      },
    }),
    [],
  )
}
