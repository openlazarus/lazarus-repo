import { Request, Response } from 'express'
import { z } from 'zod'
import { ListActivityLogsSchema } from '@domains/activity/types/activity.schemas'
import { getActivityService } from '@domains/activity/service/activity.service'
import {
  createAgentActivityLog,
  createSystemActivityLog,
  type ActorType,
  type LogType,
} from '@domains/activity/types/activity.types'
import { eventBus } from '@realtime/events/event-bus'
import {
  BadRequestError,
  NotFoundError,
  InternalServerError,
  ValidationError,
} from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const logger = createLogger('activity-controller')

const activityService = getActivityService()

class ActivityController {
  async createLog(req: Request, res: Response): Promise<void> {
    const body = req.body

    let activityLog

    if (body.type === 'agent' && body.toolCalls) {
      activityLog = createAgentActivityLog({
        title: body.title,
        agentId: body.actorId,
        agentName: body.actorName,
        toolCalls: body.toolCalls,
        workspaceId: body.workspaceId,
        workflowId: body.workflowId,
        metadata: body.metadata,
      })
    } else if (body.type === 'system' && body.description) {
      activityLog = createSystemActivityLog({
        title: body.title,
        description: body.description,
        workspaceId: body.workspaceId,
        metadata: body.metadata,
      })
    } else {
      activityLog = {
        id: `log-${Math.random().toString(36).substr(2, 16)}`,
        title: body.title,
        timestamp: new Date(),
        actor: {
          id: body.actorId,
          type: body.actorType,
          name: body.actorName,
        },
        type: body.type,
        changes: [],
        workspaceId: body.workspaceId,
        workflowId: body.workflowId,
        metadata: body.metadata,
      }
    }

    const logId = await activityService.saveActivityLog(activityLog)

    res.json({
      success: true,
      id: logId,
      log: activityLog,
    })
  }

  async listLogs(req: Request, res: Response): Promise<void> {
    try {
      const query = ListActivityLogsSchema.parse({
        workspaceId: req.query.workspaceId,
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

      const result = await activityService.listActivityLogs(query.workspaceId, {
        limit: query.limit,
        offset: query.offset,
        filter,
      })

      res.json({
        success: true,
        ...result,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Validation error')
      }
      throw error
    }
  }

  async getLog(req: Request, res: Response): Promise<void> {
    const id = req.params.id!
    const { workspaceId } = req.query

    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new BadRequestError('workspaceId is required')
    }

    const log = await activityService.getActivityLog(workspaceId, id)

    if (!log) {
      throw new NotFoundError('Activity log', id)
    }

    res.json({
      success: true,
      log,
    })
  }

  async deleteLog(req: Request, res: Response): Promise<void> {
    const id = req.params.id!
    const { workspaceId } = req.query

    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new BadRequestError('workspaceId is required')
    }

    const deleted = await activityService.deleteActivityLog(workspaceId, id)

    if (!deleted) {
      throw new NotFoundError('Activity log', id)
    }

    res.json({
      success: true,
    })
  }

  async getWorkflowLogs(req: Request, res: Response): Promise<void> {
    const workflowId = req.params.workflowId!
    const { workspaceId } = req.query

    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new BadRequestError('workspaceId is required')
    }

    const logs = await activityService.getWorkflowActivityLogs(workspaceId, workflowId)

    res.json({
      success: true,
      logs,
      count: logs.length,
    })
  }

  async getLogDetail(req: Request, res: Response): Promise<void> {
    const id = req.params.id!
    const { workspaceId } = req.query

    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new BadRequestError('workspaceId is required')
    }

    const log = await activityService.getActivityLog(workspaceId, id)

    if (!log) {
      throw new NotFoundError('Activity log', id)
    }

    res.json({
      success: true,
      log,
      conversation: log.conversation || [],
      filesModified: log.filesModified || [],
      tokenUsage: log.tokenUsage || null,
      executionContext: log.executionContext || null,
    })
  }

  async streamLog(req: Request, res: Response): Promise<void> {
    const id = req.params.id!
    const { workspaceId } = req.query

    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new BadRequestError('workspaceId is required')
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    res.write(`data: ${JSON.stringify({ type: 'connected', logId: id, workspaceId })}\n\n`)

    const log = await activityService.getActivityLog(workspaceId, id)
    if (log) {
      res.write(
        `data: ${JSON.stringify({
          type: 'initial',
          log,
          conversation: log.conversation || [],
          filesModified: log.filesModified || [],
          tokenUsage: log.tokenUsage || null,
          status: log.status || 'completed',
        })}\n\n`,
      )
    }

    const onMessage = (payload: { workspaceId: string; activityId: string; message: any }) => {
      if (payload.activityId !== id || payload.workspaceId !== workspaceId) return
      try {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: 'message', message: payload.message })}\n\n`)
        }
      } catch (error) {
        logger.error({ err: error }, 'Error writing message event')
      }
    }

    const onFileChange = (payload: {
      workspaceId: string
      activityId: string
      fileChange: any
    }) => {
      if (payload.activityId !== id || payload.workspaceId !== workspaceId) return
      try {
        if (!res.writableEnded) {
          res.write(
            `data: ${JSON.stringify({ type: 'file-change', change: payload.fileChange })}\n\n`,
          )
        }
      } catch (error) {
        logger.error({ err: error }, 'Error writing file-change event')
      }
    }

    const onStatusChange = (payload: {
      workspaceId: string
      activityId: string
      status: string
    }) => {
      if (payload.activityId !== id || payload.workspaceId !== workspaceId) return
      try {
        if (!res.writableEnded) {
          res.write(
            `data: ${JSON.stringify({ type: 'status-change', status: payload.status })}\n\n`,
          )

          const isTerminal =
            payload.status === 'completed' ||
            payload.status === 'failed' ||
            payload.status === 'cancelled'
          if (isTerminal) {
            res.write(`data: ${JSON.stringify({ type: 'done', status: payload.status })}\n\n`)
            cleanup()
            res.end()
          }
        }
      } catch (error) {
        logger.error({ err: error }, 'Error writing status-change event')
      }
    }

    eventBus.on('activity:message-added', onMessage)
    eventBus.on('activity:file-changed', onFileChange)
    eventBus.on('activity:status-changed', onStatusChange)

    const cleanup = () => {
      eventBus.off('activity:message-added', onMessage)
      eventBus.off('activity:file-changed', onFileChange)
      eventBus.off('activity:status-changed', onStatusChange)
    }

    req.on('close', () => {
      cleanup()
      if (!res.writableEnded) res.end()
    })
  }

  async stopLog(req: Request, res: Response): Promise<void> {
    const id = req.params.id!
    const { workspaceId } = req.query

    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new BadRequestError('workspaceId is required')
    }

    const log = await activityService.getActivityLog(workspaceId, id)

    if (!log) {
      throw new NotFoundError('Activity log', id)
    }

    if (log.status !== 'executing') {
      throw new BadRequestError('Activity is not currently executing')
    }

    const updated = await activityService.updateExecutionStatus(workspaceId, id, 'cancelled')

    if (!updated) {
      throw new InternalServerError('Failed to cancel activity')
    }

    res.json({
      success: true,
      message: 'Activity cancelled',
      logId: id,
    })
  }

  async getExecutingLogs(req: Request, res: Response): Promise<void> {
    const { workspaceId } = req.query

    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new BadRequestError('workspaceId is required')
    }

    const logs = await activityService.getExecutingLogs(workspaceId)

    res.json({
      success: true,
      logs,
      count: logs.length,
    })
  }
}

export const activityController = new ActivityController()
