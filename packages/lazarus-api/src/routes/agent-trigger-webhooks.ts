import express from 'express'
import { creditsMiddleware } from '@middleware/credits'
import { agentTriggerWebhooksController } from '@domains/agent/controller/agent-trigger-webhooks.controller'

const router = express.Router()

router.post('/:agentId/:triggerId', creditsMiddleware, (req, res) =>
  agentTriggerWebhooksController.handleWebhook(req, res),
)

export { router as agentTriggerWebhooksRouter }
