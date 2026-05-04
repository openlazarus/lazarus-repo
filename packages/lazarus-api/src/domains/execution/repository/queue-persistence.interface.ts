import type { PersistedTask } from './queue-persistence'

export interface IQueuePersistence {
  /** Initialize the queue directory on disk. */
  init(): Promise<void>
  /** Persist a task to disk. */
  save(task: PersistedTask): Promise<void>
  /** Update the state of a persisted task. */
  updateState(executionId: string, state: PersistedTask['state']): Promise<void>
  /** Remove a persisted task file. */
  remove(executionId: string): Promise<void>
  /** Recover all persisted tasks from disk after a crash. */
  recover(): Promise<PersistedTask[]>
  /** Remove all persisted task files and return the count. */
  clear(): Promise<number>
}
