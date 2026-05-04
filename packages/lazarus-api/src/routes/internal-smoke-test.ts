import { Router } from 'express'
import { requireInternal } from '@middleware/internal-only'
import { validateBody } from '@middleware/validate'
import { ImpersonateSchema } from '../shared/types/internal/smoke-test.schemas'
import { internalSmokeTestController } from '@shared/controller/internal-smoke-test.controller'

export const internalSmokeTestRouter = Router()

internalSmokeTestRouter.post(
  '/impersonate',
  requireInternal(),
  validateBody(ImpersonateSchema),
  (req, res) => internalSmokeTestController.impersonate(req, res),
)
