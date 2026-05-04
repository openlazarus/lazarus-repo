import { Router } from 'express'
import { instanceAuth } from '@middleware/instance-auth'
import { slackWebhookController } from '@domains/slack/controller/slack-webhook.controller'

const router = Router()

router.post('/events', instanceAuth, (req, res) => slackWebhookController.handleEvents(req, res))

router.post('/command', instanceAuth, (req, res) => slackWebhookController.handleCommand(req, res))

router.post('/interactivity', instanceAuth, (req, res) =>
  slackWebhookController.handleInteractivity(req, res),
)

export default router
