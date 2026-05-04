import { Router } from 'express'
import { verifySlackSignature, verifySlackEventsSignature } from '@middleware/slack-signature'
import { slackWebhookController } from '@domains/slack/controller/slack-webhook.controller'

const router = Router()

router.post('/events', verifySlackEventsSignature(), (req, res) =>
  slackWebhookController.handleEvents(req, res),
)

router.post('/command', verifySlackSignature(), (req, res) =>
  slackWebhookController.handleCommand(req, res),
)

router.post('/interactivity', verifySlackSignature(), (req, res) =>
  slackWebhookController.handleInteractivity(req, res),
)

export default router
