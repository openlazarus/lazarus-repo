import * as express from 'express'
import { whatsappRouterController } from '@domains/whatsapp/controller/whatsapp-router.controller'

const router = express.Router()

router.get('/webhook', (req, res) => whatsappRouterController.verifyWebhook(req, res))

router.post('/webhook', (req, res) => whatsappRouterController.handleWebhook(req, res))

router.get('/webhook/health', (req, res) => whatsappRouterController.healthCheck(req, res))

export { router as whatsappRouter }
