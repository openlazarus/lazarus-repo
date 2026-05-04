import { Router } from 'express'
import { agentWebhooksController } from '@domains/agent/controller/agent-webhooks.controller'

const router = Router()

// Credits check is INLINE in handleAgentEmail so we can reply via email,
// not return a 402 to the email ingress pipeline.
router.post('/agent-email/:agentId', (req, res) =>
  agentWebhooksController.handleAgentEmail(req, res),
)
router.post('/agent-email-status/:agentId', (req, res) =>
  agentWebhooksController.handleAgentEmailStatus(req, res),
)

export { router as agentWebhooksRouter }
