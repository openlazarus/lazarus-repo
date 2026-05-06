import { Request, Response } from 'express'
import { WorkspaceActivityLogsQuerySchema } from '@domains/activity/types/activity.schemas'
import { getActivityService } from '@domains/activity/service/activity.service'
import type { ActorType, LogType } from '@domains/activity/types/activity.types'
import { NotFoundError } from '@errors/api-errors'

const activityService = getActivityService()

class WorkspaceActivityController {
  async listActivity(req: Request, res: Response) {
    const workspaceId = req.workspace!.id

    const query = WorkspaceActivityLogsQuerySchema.parse({
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      search: req.query.search,
      actors: req.query.actors ? (req.query.actors as string).split(',') : undefined,
      actorTypes: req.query.actorTypes ? (req.query.actorTypes as string).split(',') : undefined,
      types: req.query.types ? (req.query.types as string).split(',') : undefined,
    })

    const filter = {
      search: query.search,
      actors: query.actors,
      actorTypes: query.actorTypes as ActorType[] | undefined,
      types: query.types as LogType[] | undefined,
    }

    const isSummary = req.query.summary === 'true'

    if (isSummary) {
      const result = await activityService.listActivityLogsSummary(workspaceId, {
        limit: query.limit,
        offset: query.offset,
        filter,
      })

      return res.json({
        success: true,
        summaries: result.summaries,
        total: result.total,
        offset: result.offset,
        limit: result.limit,
        hasMore: result.hasMore,
        workspaceId,
      })
    }

    const result = await activityService.listActivityLogs(workspaceId, {
      limit: query.limit,
      offset: query.offset,
      filter,
    })

    return res.json({
      success: true,
      ...result,
      workspaceId,
    })
  }

  async getContributions(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear()

    const counts = await activityService.getContributionData(workspaceId, year)

    return res.json({ success: true, year, counts })
  }

  async getActivityLog(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const logId = req.params.logId!

    const log = await activityService.getActivityLog(workspaceId, logId)

    if (!log) {
      throw new NotFoundError('Activity log', logId)
    }

    return res.json({
      success: true,
      log,
    })
  }

  async getWorkflowActivity(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const workflowId = req.params.workflowId!

    const logs = await activityService.getWorkflowActivityLogs(workspaceId, workflowId)

    return res.json({
      success: true,
      logs,
      count: logs.length,
      workflowId,
    })
  }
}

export const workspaceActivityController = new WorkspaceActivityController()
