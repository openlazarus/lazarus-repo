/**
 * WhatsApp Message Queue Service
 *
 * Ensures per-agent sequential processing of WhatsApp messages.
 * When an agent is already executing a trigger, incoming messages
 * are queued and processed one at a time after the current execution finishes.
 */

interface QueuedMessage {
  workspaceId: string
  userId: string
  agentId: string
  workspacePath: string
  message: any
  activityLogId?: string
  phoneNumberId?: string
}

type ExecuteFn = (
  workspaceId: string,
  userId: string,
  agentId: string,
  workspacePath: string,
  message: any,
  activityLogId?: string,
  phoneNumberId?: string,
) => Promise<void>

interface AgentQueue {
  processing: boolean
  messages: QueuedMessage[]
}

import type { IWhatsAppQueueService } from './whatsapp-queue.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('whatsapp-queue')

class WhatsAppQueueService implements IWhatsAppQueueService {
  private queues: Map<string, AgentQueue> = new Map()
  private executeFn: ExecuteFn | null = null

  /**
   * Set the trigger execution function.
   * Called once during initialization from the router.
   */
  setExecutor(fn: ExecuteFn): void {
    this.executeFn = fn
  }

  /**
   * Build a unique key for each agent queue.
   */
  private getKey(workspaceId: string, agentId: string): string {
    return `${workspaceId}:${agentId}`
  }

  /**
   * Enqueue a message for processing.
   * If the agent is idle, processing starts immediately.
   * If the agent is busy, the message waits in queue.
   */
  async enqueue(item: QueuedMessage): Promise<void> {
    const key = this.getKey(item.workspaceId, item.agentId)

    let queue = this.queues.get(key)
    if (!queue) {
      queue = { processing: false, messages: [] }
      this.queues.set(key, queue)
    }

    queue.messages.push(item)
    log.info(
      `Enqueued message ${item.message?.id || 'unknown'} for agent ${item.agentId} | queue size: ${queue.messages.length} | processing: ${queue.processing}`,
    )

    if (!queue.processing) {
      log.info(`Agent ${item.agentId} is idle, starting processing`)
      // Fire and forget — don't block the caller (webhook must respond 200 fast)
      this.processNext(key).catch((err) => log.error({ err }, `Unexpected error in processNext`))
    } else {
      log.info(`Agent ${item.agentId} is busy, message queued (position: ${queue.messages.length})`)
    }
  }

  /**
   * Process the next message in the agent's queue.
   */
  private async processNext(key: string): Promise<void> {
    const queue = this.queues.get(key)
    if (!queue || queue.messages.length === 0) {
      if (queue) {
        queue.processing = false
      }
      return
    }

    if (!this.executeFn) {
      log.error('No executor function set')
      queue.messages = []
      queue.processing = false
      return
    }

    queue.processing = true
    const item = queue.messages.shift()!
    const startTime = Date.now()

    log.info(
      `>>> Start processing message ${item.message?.id || 'unknown'} for agent ${item.agentId} | remaining in queue: ${queue.messages.length}`,
    )

    try {
      await this.executeFn(
        item.workspaceId,
        item.userId,
        item.agentId,
        item.workspacePath,
        item.message,
        item.activityLogId,
        item.phoneNumberId,
      )
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      log.info(
        `<<< Finished message ${item.message?.id || 'unknown'} for agent ${item.agentId} in ${elapsed}s`,
      )
    } catch (error) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      log.error(
        { err: error },
        `<<< Error processing message ${item.message?.id || 'unknown'} for agent ${item.agentId} after ${elapsed}s:`,
      )
    }

    // Process next message regardless of success/failure
    if (queue.messages.length > 0) {
      log.info(
        `Agent ${item.agentId} has ${queue.messages.length} more message(s) queued, continuing`,
      )
    } else {
      log.info(`Agent ${item.agentId} queue empty, going idle`)
    }
    await this.processNext(key)
  }

  /**
   * Get the current queue size for an agent.
   */
  getQueueSize(workspaceId: string, agentId: string): number {
    const key = this.getKey(workspaceId, agentId)
    const queue = this.queues.get(key)
    return queue ? queue.messages.length : 0
  }

  /**
   * Check if an agent is currently processing a message.
   */
  isProcessing(workspaceId: string, agentId: string): boolean {
    const key = this.getKey(workspaceId, agentId)
    const queue = this.queues.get(key)
    return queue?.processing ?? false
  }

  /**
   * Clear the queue for an agent (e.g., on disconnect).
   */
  clearQueue(workspaceId: string, agentId: string): void {
    const key = this.getKey(workspaceId, agentId)
    const queue = this.queues.get(key)
    if (queue) {
      const dropped = queue.messages.length
      queue.messages = []
      if (dropped > 0) {
        log.info(`Cleared ${dropped} messages for ${agentId}`)
      }
    }
  }
}

export const whatsappQueue: IWhatsAppQueueService = new WhatsAppQueueService()
