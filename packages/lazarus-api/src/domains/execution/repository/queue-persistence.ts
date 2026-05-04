/**
 * Queue Persistence — Survives crashes and service restarts.
 *
 * Writes pending trigger tasks to disk so they can be recovered after a crash.
 * Each queued task gets a JSON file in {STORAGE_BASE_PATH}/.queue/.
 * On startup, leftover files indicate tasks that were queued or in-progress
 * when the process died — they get re-enqueued automatically.
 *
 * File lifecycle:
 *   enqueue  → write   {executionId}.json
 *   complete → delete  {executionId}.json
 *   crash    → file stays, recovered on next startup
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { getStoragePath } from '@infrastructure/config/storage'
import type { IQueuePersistence } from './queue-persistence.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('queue-persistence')

// ── Persisted task descriptor ──────────────────────────────────────

export interface PersistedTask {
  executionId: string
  agentId: string
  workspaceId: string
  userId: string
  triggerId: string
  triggerType: string
  triggerName: string
  triggerData?: any
  cascadeDepth?: number
  persistedAt: string
  /** Set to 'running' once the task acquires a slot */
  state: 'queued' | 'running'
}

// ── Persistence implementation ─────────────────────────────────────

class QueuePersistence implements IQueuePersistence {
  private readonly queueDir: string
  private initialized = false

  constructor() {
    this.queueDir = getStoragePath('.queue')
  }

  async init(): Promise<void> {
    if (this.initialized) return
    await fs.mkdir(this.queueDir, { recursive: true })
    this.initialized = true
  }

  async save(task: PersistedTask): Promise<void> {
    await this.init()
    const filePath = this.taskPath(task.executionId)
    await fs.writeFile(filePath, JSON.stringify(task, null, 2), 'utf-8')
  }

  async updateState(executionId: string, state: PersistedTask['state']): Promise<void> {
    const filePath = this.taskPath(executionId)
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const task: PersistedTask = JSON.parse(raw)
      task.state = state
      await fs.writeFile(filePath, JSON.stringify(task, null, 2), 'utf-8')
    } catch (err) {
      log.debug({ err }, 'File may have been deleted already')
    }
  }

  async remove(executionId: string): Promise<void> {
    const filePath = this.taskPath(executionId)
    try {
      await fs.unlink(filePath)
    } catch (err) {
      log.debug({ err }, 'Already removed')
    }
  }

  async recover(): Promise<PersistedTask[]> {
    await this.init()
    const tasks: PersistedTask[] = []

    let files: string[]
    try {
      files = await fs.readdir(this.queueDir)
    } catch {
      return tasks
    }

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const raw = await fs.readFile(path.join(this.queueDir, file), 'utf-8')
        tasks.push(JSON.parse(raw))
      } catch (err) {
        log.error({ err: err }, `Failed to read ${file}, removing corrupt entry:`)
        await fs.unlink(path.join(this.queueDir, file)).catch(() => {})
      }
    }

    if (tasks.length > 0) {
      log.info(
        `Recovered ${tasks.length} tasks from disk (${tasks.filter((t) => t.state === 'running').length} were in-progress, ${tasks.filter((t) => t.state === 'queued').length} were queued)`,
      )
    }

    return tasks
  }

  async clear(): Promise<number> {
    await this.init()
    let count = 0
    try {
      const files = await fs.readdir(this.queueDir)
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        await fs.unlink(path.join(this.queueDir, file))
        count++
      }
    } catch (err) {
      log.debug({ err }, 'Directory may not exist')
    }
    return count
  }

  private taskPath(executionId: string): string {
    return path.join(this.queueDir, `${executionId}.json`)
  }
}

/** Global singleton */
export const queuePersistence: IQueuePersistence = new QueuePersistence()
