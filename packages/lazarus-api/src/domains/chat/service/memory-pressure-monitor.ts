/**
 * Memory Pressure Monitor — Periodic check of system free memory.
 *
 * When free memory drops below the reject threshold, new chat sessions
 * are refused with 503. A warning threshold logs alerts before that point.
 *
 * Uses os.freemem() (system-wide) rather than process.memoryUsage()
 * because MCP child processes are the main memory consumers and they
 * live outside the main Node heap.
 */

import * as os from 'os'
import { EXECUTION_LIMITS } from '@infrastructure/config/execution-limits'
import { createLogger } from '@utils/logger'
import type { IMemoryPressureMonitor, MemoryStats } from './memory-pressure-monitor.interface'

const log = createLogger('memory-monitor')

function toMb(bytes: number): number {
  return Math.round(bytes / 1024 / 1024)
}

function readFreeMb(): number {
  return toMb(os.freemem())
}

function readTotalMb(): number {
  return toMb(os.totalmem())
}

function readProcessMemory(): {
  rssMb: number
  heapUsedMb: number
  heapTotalMb: number
  heapRatio: number
} {
  const mem = process.memoryUsage()
  const heapRatio = mem.heapTotal > 0 ? mem.heapUsed / mem.heapTotal : 0
  return {
    rssMb: toMb(mem.rss),
    heapUsedMb: toMb(mem.heapUsed),
    heapTotalMb: toMb(mem.heapTotal),
    heapRatio,
  }
}

class MemoryPressureMonitor implements IMemoryPressureMonitor {
  private pressureFlag = false
  private timer: NodeJS.Timeout | null = null

  isUnderPressure(): boolean {
    return this.pressureFlag
  }

  start(): void {
    this.check()
    this.timer = setInterval(() => this.check(), EXECUTION_LIMITS.memoryCheckIntervalMs)
    log.info(
      {
        intervalMs: EXECUTION_LIMITS.memoryCheckIntervalMs,
        rejectMb: EXECUTION_LIMITS.memoryRejectThresholdMb,
        warnMb: EXECUTION_LIMITS.memoryWarnThresholdMb,
      },
      'Memory pressure monitor started',
    )
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  getStats(): MemoryStats {
    const { rssMb, heapUsedMb } = readProcessMemory()
    return {
      freeMb: readFreeMb(),
      totalMb: readTotalMb(),
      rssMb,
      heapUsedMb,
      underPressure: this.pressureFlag,
    }
  }

  private check(): void {
    const freeMb = readFreeMb()
    const { rssMb, heapUsedMb, heapTotalMb, heapRatio } = readProcessMemory()

    this.updatePressureFlag(freeMb, rssMb, heapUsedMb, heapTotalMb, heapRatio)
    this.logIfLow(freeMb, rssMb, heapUsedMb, heapRatio)
  }

  private updatePressureFlag(
    freeMb: number,
    rssMb: number,
    heapUsedMb: number,
    heapTotalMb: number,
    heapRatio: number,
  ): void {
    const shouldReject = freeMb < EXECUTION_LIMITS.memoryRejectThresholdMb

    if (shouldReject && !this.pressureFlag) {
      log.error(
        { freeMb, rssMb, heapUsedMb, heapTotalMb, heapRatio },
        'Memory pressure: rejecting/queueing new agent executions',
      )
    }
    if (!shouldReject && this.pressureFlag) {
      log.info({ freeMb }, 'Memory pressure cleared')
    }

    this.pressureFlag = shouldReject
  }

  private logIfLow(freeMb: number, rssMb: number, heapUsedMb: number, heapRatio: number): void {
    if (freeMb < EXECUTION_LIMITS.memoryWarnThresholdMb) {
      log.warn({ freeMb, rssMb, heapUsedMb, heapRatio }, 'Memory running low')
    }
  }
}

export const memoryPressureMonitor: IMemoryPressureMonitor = new MemoryPressureMonitor()
