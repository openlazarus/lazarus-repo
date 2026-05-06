import { Router } from 'express'
import {
  CreateWorkspaceAgentSchema,
  UpdateWorkspaceAgentSchema,
  TriggerConfigSchema,
  UpdateTriggerSchema,
} from '../domains/agent/types/agent.schemas'
import {
  requireAuth,
  requireWorkspaceAccess,
  requireWorkspaceAdmin,
  requireWorkspaceEditor,
} from '@middleware/auth'
import { validateBody } from '@middleware/validate'
import { requireInternal } from '@middleware/internal-only'
import { instanceAuth } from '@middleware/instance-auth'
import { creditsMiddleware } from '@middleware/credits'
import { workspaceAgentsController } from '@domains/agent/controller/workspace-agents.controller'

export const workspaceAgentsRouter = Router()

// Agent CRUD
workspaceAgentsRouter.get(
  '/agents',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.listAgents,
)
workspaceAgentsRouter.get(
  '/agents/:agentId',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.getAgent,
)
workspaceAgentsRouter.post(
  '/agents',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  validateBody(CreateWorkspaceAgentSchema),
  workspaceAgentsController.createAgent,
)
workspaceAgentsRouter.put(
  '/agents/:agentId',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  validateBody(UpdateWorkspaceAgentSchema),
  workspaceAgentsController.updateAgent,
)
workspaceAgentsRouter.delete(
  '/agents/:agentId',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  workspaceAgentsController.deleteAgent,
)
workspaceAgentsRouter.post(
  '/agents/:agentId/enable',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  workspaceAgentsController.enableAgent,
)
workspaceAgentsRouter.post(
  '/agents/:agentId/disable',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  workspaceAgentsController.disableAgent,
)

// Triggers
workspaceAgentsRouter.get(
  '/agents/:agentId/triggers',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.listTriggers,
)
workspaceAgentsRouter.post(
  '/agents/:agentId/triggers',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  validateBody(TriggerConfigSchema),
  workspaceAgentsController.createTrigger,
)
workspaceAgentsRouter.get(
  '/agents/:agentId/triggers/:triggerId',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.getTrigger,
)
workspaceAgentsRouter.put(
  '/agents/:agentId/triggers/:triggerId',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  validateBody(UpdateTriggerSchema),
  workspaceAgentsController.updateTrigger,
)
workspaceAgentsRouter.delete(
  '/agents/:agentId/triggers/:triggerId',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  workspaceAgentsController.deleteTrigger,
)
workspaceAgentsRouter.post(
  '/agents/:agentId/triggers/:triggerId/execute',
  requireAuth(),
  requireWorkspaceAccess(),
  creditsMiddleware,
  workspaceAgentsController.executeTrigger,
)
workspaceAgentsRouter.post(
  '/agents/:agentId/triggers/:triggerId/run',
  requireAuth(),
  requireWorkspaceAccess(),
  creditsMiddleware,
  workspaceAgentsController.executeTrigger,
)
workspaceAgentsRouter.post(
  '/agents/:agentId/trigger',
  requireInternal(),
  creditsMiddleware,
  workspaceAgentsController.internalTrigger,
)
workspaceAgentsRouter.post(
  '/agents/run',
  instanceAuth,
  creditsMiddleware,
  workspaceAgentsController.agentRun,
)
workspaceAgentsRouter.get(
  '/agents/:agentId/triggers/:triggerId/executions',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.getTriggerExecutions,
)

// Email settings
workspaceAgentsRouter.put(
  '/agents/:agentId/auto-trigger-email',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  workspaceAgentsController.toggleAutoTriggerEmail,
)
workspaceAgentsRouter.put(
  '/agents/:agentId/email-restriction',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  workspaceAgentsController.toggleEmailRestriction,
)
workspaceAgentsRouter.get(
  '/agents/:agentId/email-allowlist',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.getEmailAllowlist,
)
workspaceAgentsRouter.put(
  '/agents/:agentId/email-allowlist',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  workspaceAgentsController.updateEmailAllowlist,
)

// Agent files and config
workspaceAgentsRouter.get(
  '/agents/:agentId/files',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.listAgentFiles,
)
workspaceAgentsRouter.post(
  '/initialize-system-agents',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceAdmin(),
  workspaceAgentsController.initializeSystemAgents,
)
workspaceAgentsRouter.get(
  '/agents/:agentId/config',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.getAgentConfig,
)

// WhatsApp
workspaceAgentsRouter.get(
  '/agents/:agentId/whatsapp',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.getWhatsAppConfig,
)
workspaceAgentsRouter.delete(
  '/agents/:agentId/whatsapp',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  workspaceAgentsController.disconnectWhatsApp,
)
workspaceAgentsRouter.post(
  '/whatsapp/setup-link',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  workspaceAgentsController.createWhatsAppSetupLink,
)
workspaceAgentsRouter.get(
  '/whatsapp/customer',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.getWhatsAppCustomer,
)
workspaceAgentsRouter.get(
  '/whatsapp/phone-numbers',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.listPhoneNumbers,
)
workspaceAgentsRouter.post(
  '/agents/:agentId/whatsapp/assign',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  workspaceAgentsController.assignWhatsApp,
)
workspaceAgentsRouter.put(
  '/agents/:agentId/whatsapp/settings',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  workspaceAgentsController.updateWhatsAppSettings,
)

// Execution management
workspaceAgentsRouter.post(
  '/executions/:executionId/stop',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.stopExecution,
)

// MCP tools discovery
workspaceAgentsRouter.get(
  '/agents/:agentId/mcp-tools',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceAgentsController.getMCPTools,
)
