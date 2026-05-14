import { Router } from 'express'
import { instanceAuth } from '@middleware/instance-auth'
import { discordWebhookController } from '@domains/discord/controller/discord-webhook.controller'

const router = Router()

router.post('/message', instanceAuth, (req, res) =>
  discordWebhookController.handleGatewayMessage(req, res),
)

export default router
