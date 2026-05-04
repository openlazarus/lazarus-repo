import { Router } from 'express'
import { ChatRequestSchema } from '../domains/chat/types/chat.schemas'
import { requireAuth } from '@middleware/auth'
import { requireInternal } from '@middleware/internal-only'
import { validateBody } from '@middleware/validate'
import { creditsMiddleware } from '@middleware/credits'
import { asyncHandler } from '@middleware/error-handler'
import { chatController } from '@domains/chat/controller/chat.controller'

export const chatRouter = Router()

chatRouter.post(
  '/stream',
  requireAuth(),
  creditsMiddleware,
  validateBody(ChatRequestSchema),
  asyncHandler(chatController.stream),
)
chatRouter.post('/query', requireAuth(), creditsMiddleware, asyncHandler(chatController.query))
chatRouter.post(
  '/internal/permission-request',
  requireInternal(),
  asyncHandler(chatController.internalPermissionRequest),
)
chatRouter.post(
  '/permission-response',
  requireAuth(),
  asyncHandler(chatController.permissionResponse),
)
chatRouter.post('/ask-user-response', requireAuth(), asyncHandler(chatController.askUserResponse))
