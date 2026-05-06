/**
 * Interface for monitoring system memory pressure.
 */
export interface MemoryStats {
  freeMb: number
  totalMb: number
  rssMb: number
  heapUsedMb: number
  underPressure: boolean
}

export interface IMemoryPressureMonitor {
  /** Check whether the system is currently under memory pressure. */
  isUnderPressure(): boolean

  /** Start periodic memory checks. */
  start(): void

  /** Stop periodic memory checks. */
  stop(): void

  /** Get current memory statistics. */
  getStats(): MemoryStats
}
