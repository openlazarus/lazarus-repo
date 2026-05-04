import express from 'express'
import { emailRouterController } from '@domains/email/controller/email-router.controller'

const router = express.Router()

router.post('/route', (req, res) => emailRouterController.route(req, res))

router.get('/route/health', (req, res) => emailRouterController.healthCheck(req, res))

export { router as emailRouterRouter }
