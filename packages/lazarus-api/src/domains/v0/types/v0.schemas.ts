import { z } from 'zod'

export const GenerateTokenSchema = z.object({
  v0ProjectId: z.string(),
  v0AppUrl: z.string().url().optional(),
})

export const ExchangeTokenSchema = z.object({
  token: z.string(),
})

export const SetupDeploymentSchema = z.object({
  appId: z.string(),
  deploymentUrl: z.string().url(),
  projectId: z.string(),
  deploymentPlatform: z.enum(['vercel', 'netlify', 'custom']).optional(),
})
