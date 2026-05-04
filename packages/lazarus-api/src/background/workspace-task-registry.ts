/**
 * Workspace Task Registry
 *
 * Tracks all background tasks (timers, intervals) for a specific workspace
 * Ensures clean shutdown when workspace is unloaded
 */

import { createLogger } from '@utils/logger'
import { TaskInfo } from './types'

const log = createLogger('workspace-task-registry')

export class WorkspaceTaskRegistry {
  private workspaceId: string
  private tasks: Map<string, NodeJS.Timeout> = new Map()
  private taskInfo: Map<string, TaskInfo> = new Map()

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId
  }

  /**
   * Register an interval timer
   */
  registerInterval(taskId: string, interval: NodeJS.Timeout, description: string): void {
    // Clear existing task if it exists
    if (this.tasks.has(taskId)) {
      this.clearTask(taskId)
    }

    this.tasks.set(taskId, interval)
    this.taskInfo.set(taskId, {
      id: taskId,
      type: 'interval',
      workspaceId: this.workspaceId,
      description,
      createdAt: new Date().toISOString(),
    })

    log.info(
      { workspaceId: this.workspaceId, taskId, kind: 'interval' },
      'Registered interval task',
    )
  }

  /**
   * Register a timeout timer
   */
  registerTimeout(taskId: string, timeout: NodeJS.Timeout, description: string): void {
    // Clear existing task if it exists
    if (this.tasks.has(taskId)) {
      this.clearTask(taskId)
    }

    this.tasks.set(taskId, timeout)
    this.taskInfo.set(taskId, {
      id: taskId,
      type: 'timeout',
      workspaceId: this.workspaceId,
      description,
      createdAt: new Date().toISOString(),
    })

    log.info({ workspaceId: this.workspaceId, taskId, kind: 'timeout' }, 'Registered timeout task')
  }

  /**
   * Clear a specific task
   */
  clearTask(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      clearTimeout(task)
      clearInterval(task)
      this.tasks.delete(taskId)
      this.taskInfo.delete(taskId)

      log.info({ workspaceId: this.workspaceId, taskId }, 'Cleared task')
    }
  }

  /**
   * Clear all tasks for this workspace
   */
  clearAll(): void {
    log.info({ workspaceId: this.workspaceId, taskCount: this.tasks.size }, 'Clearing all tasks')

    for (const [taskId, task] of this.tasks.entries()) {
      clearTimeout(task)
      clearInterval(task)
      log.info({ workspaceId: this.workspaceId, taskId }, 'Cleared task')
    }

    this.tasks.clear()
    this.taskInfo.clear()
  }

  /**
   * Get list of active task IDs
   */
  getActiveTasks(): string[] {
    return Array.from(this.tasks.keys())
  }

  /**
   * Get task information
   */
  getTaskInfo(taskId: string): TaskInfo | undefined {
    return this.taskInfo.get(taskId)
  }

  /**
   * Get all task information
   */
  getAllTaskInfo(): TaskInfo[] {
    return Array.from(this.taskInfo.values())
  }

  /**
   * Check if task exists
   */
  hasTask(taskId: string): boolean {
    return this.tasks.has(taskId)
  }

  /**
   * Get task count
   */
  getTaskCount(): number {
    return this.tasks.size
  }

  /**
   * Get workspace ID
   */
  getWorkspaceId(): string {
    return this.workspaceId
  }
}
