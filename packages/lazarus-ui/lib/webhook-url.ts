import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'

export const buildAgentTriggerWebhookUrl = (
  workspaceId: string,
  agentId: string,
  triggerId: string,
): string =>
  `${getWorkspaceBaseUrl(workspaceId)}/api/hooks/${agentId}/${triggerId}`
