import { Router } from 'express'
import { discordWebhookController } from '@domains/discord/controller/discord-webhook.controller'

const router = Router()

router.post('/', (req, res) => discordWebhookController.handleInteraction(req, res))

export default router
