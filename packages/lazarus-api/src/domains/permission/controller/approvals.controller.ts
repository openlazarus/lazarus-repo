import { Request, Response } from 'express'
import { approvalService } from '@domains/permission/service/approval.service'
import { BackgroundPermissionManager } from '@domains/permission/service/background-permission-manager'
import { NotFoundError, BadRequestError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const log = createLogger('approvals')

class ApprovalsController {
  async list(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const approvals = await approvalService.getPendingByWorkspace(workspaceId)
    res.json({ approvals, count: approvals.length })
  }

  async getCount(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const count = await approvalService.getPendingCount(workspaceId)
    res.json({ count })
  }

  async get(req: Request, res: Response) {
    const approvalId = req.params.approvalId!
    const approval = await approvalService.getApproval(approvalId)

    if (!approval) {
      throw new NotFoundError('Approval', approvalId)
    }

    res.json({ approval })
  }

  async resolve(req: Request, res: Response) {
    const approvalId = req.params.approvalId!
    const { approved } = req.body
    const userId = req.user?.id || 'unknown'

    if (typeof approved !== 'boolean') {
      throw new BadRequestError('approved field must be a boolean')
    }

    const bgPermManager = BackgroundPermissionManager.getInstance()
    bgPermManager.resolve(approvalId, approved, userId)

    try {
      await approvalService.resolveApproval(approvalId, approved, userId)
    } catch (err) {
      log.info(`DB update for ${approvalId} may have already been applied`)
    }

    res.json({ success: true, approvalId, approved })
  }
}

export const approvalsController = new ApprovalsController()
