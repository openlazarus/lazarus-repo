/**
 * V0 app record stored in .app files
 */
export interface V0App {
  id: string
  name: string
  description?: string
  chatId?: string
  projectId?: string
  webUrl?: string
  deploymentUrl?: string
  deploymentStatus?: 'not_deployed' | 'deploying' | 'deployed' | 'failed'
  deploymentPlatform?: 'vercel' | 'netlify' | 'custom'
  deploymentError?: string
  apiKeyId?: string
  apiKeyName?: string
  syncedAt?: string
  status: 'draft' | 'ready' | 'deployed' | 'error'
  environmentVars?: Array<{
    key: string
    value?: string
    synced: boolean
  }>
  filesSummary?: {
    count: number
    languages: string[]
  }
  features?: string[]
  designPrinciples?: string[]
  technicalStack?: string[]
  businessContext?: Record<string, any>
  createdAt: string
  updatedAt: string
}

/** Short-lived v0 auth token payload */
export interface V0TokenData {
  userId: string
  workspaceId: string
  v0ProjectId: string
  expiresAt: number
}
