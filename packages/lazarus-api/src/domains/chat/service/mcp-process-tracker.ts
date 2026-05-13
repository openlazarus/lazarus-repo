/**
 * MCP Process Tracker — Tracks and cleans up MCP child processes spawned by the Claude SDK.
 *
 * Each chat session injects a unique LAZARUS_CHAT_SESSION_ID env var into MCP server
 * configs. On disconnect/abort/completion, this tracker scans /proc to find and kill
 * processes carrying that tag.
 *
 * Same proven pattern as workspace-agent-executor.cleanupOrphanedMCPProcesses().
 */

import * as fsSync from 'fs'
import { execSync } from 'child_process'
import { createLogger } from '@utils/logger'
import type { IMcpProcessTracker } from './mcp-process-tracker.interface'

const log = createLogger('mcp-process-tracker')

export const MCP_SESSION_ENV_KEY = 'LAZARUS_CHAT_SESSION_ID'

function findCandidatePids(): number[] {
  try {
    const output = execSync('pgrep -u lazarus -f "node|npm|pnpm"', {
      encoding: 'utf-8',
      timeout: 5_000,
    })
    return output
      .trim()
      .split('\n')
      .map((p) => parseInt(p, 10))
      .filter((p) => !isNaN(p))
  } catch {
    return []
  }
}

function processMatchesTag(pid: number, sessionTag: string): boolean {
  try {
    const environ = fsSync.readFileSync(`/proc/${pid}/environ`, 'utf-8')
    return environ.includes(`${MCP_SESSION_ENV_KEY}=${sessionTag}`)
  } catch {
    return false
  }
}

function killProcess(pid: number): boolean {
  try {
    process.kill(pid, 'SIGTERM')
    return true
  } catch (err: any) {
    if (err.code !== 'ESRCH') {
      log.warn({ pid, err: err.message }, 'Failed to kill MCP process')
    }
    return false
  }
}

class McpProcessTracker implements IMcpProcessTracker {
  private counter = 0

  generateTag(): string {
    this.counter++
    return `chat-${process.pid}-${Date.now()}-${this.counter}`
  }

  cleanup(sessionTag: string): number {
    const backendPid = process.pid
    const candidates = findCandidatePids()
    let killed = 0

    for (const pid of candidates) {
      if (pid === backendPid) continue
      if (!processMatchesTag(pid, sessionTag)) continue
      if (killProcess(pid)) killed++
    }

    if (killed > 0) {
      log.info({ sessionTag, killed }, 'Cleaned up MCP processes for chat session')
    }

    return killed
  }
}

export const mcpProcessTracker: IMcpProcessTracker = new McpProcessTracker()
