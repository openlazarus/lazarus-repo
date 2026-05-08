import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { execFile } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs/promises'
import { getExecutionContext } from '@domains/execution/service/execution-context'
import { createLogger } from '@utils/logger'

const log = createLogger('browser-tools')

const execFileAsync = promisify(execFile)

/**
 * Browser tools for agents to browse the web using agent-browser (Playwright-based headless browser).
 *
 * Session isolation:
 * - Each agent execution gets a unique session: laz_{workspaceId}_{agentId}_{timestamp}
 * - Sessions use AGENT_BROWSER_SESSION env var for daemon-level isolation
 * - Concurrent agents get separate Chromium instances with separate Unix sockets
 *
 * Context is read from environment variables set by WorkspaceAgentExecutor:
 *   AGENT_ID, WORKSPACE_ID, WORKSPACE_PATH, BROWSER_EXECUTION_TS
 */

const MAX_BROWSER_SESSIONS = parseInt(process.env.MAX_BROWSER_SESSIONS || '5', 10)
const DEFAULT_TIMEOUT_MS = 30_000
const MAX_OUTPUT_BYTES = 1024 * 1024 // 1MB

/**
 * Get browser session ID for the current agent execution
 */
function getBrowserSessionId(): string {
  const ctx = getExecutionContext()
  const workspaceId = ctx.workspaceId || 'unknown'
  const agentId = ctx.agentId || 'unknown'
  const ts = ctx.browserExecutionTs || Date.now().toString()
  return `laz_${workspaceId}_${agentId}_${ts}`
}

/**
 * Get workspace path for storing screenshots
 */
function getWorkspacePath(): string {
  return getExecutionContext().workspacePath || '/mnt/sdc/storage'
}

/**
 * Tracks active browser sessions for cleanup and concurrency limiting
 */
class BrowserSessionManager {
  private activeSessions = new Map<string, { startedAt: number }>()

  registerSession(sessionId: string): void {
    this.activeSessions.set(sessionId, { startedAt: Date.now() })
  }

  unregisterSession(sessionId: string): void {
    this.activeSessions.delete(sessionId)
  }

  getActiveCount(): number {
    return this.activeSessions.size
  }

  async cleanupSession(sessionId: string): Promise<void> {
    try {
      // Try graceful close via CLI
      await runBrowserCommand(['close'], 10_000, sessionId)
    } catch (err) {
      log.debug({ err }, 'Graceful close failed, session may already be dead')
    }
    this.activeSessions.delete(sessionId)
  }

  async cleanupAllSessions(): Promise<void> {
    const sessions = [...this.activeSessions.keys()]
    for (const sessionId of sessions) {
      await this.cleanupSession(sessionId)
    }
  }
}

export const browserSessionManager = new BrowserSessionManager()

const findPlaywrightHeadlessShell = async (home: string): Promise<string | null> => {
  const root = path.join(home, '.cache', 'ms-playwright')
  try {
    const dirs = await fs.readdir(root)
    const shellDir = dirs
      .filter((d) => d.startsWith('chromium_headless_shell-'))
      .sort()
      .pop()
    if (!shellDir) return null
    return path.join(root, shellDir, 'chrome-headless-shell-linux64', 'chrome-headless-shell')
  } catch {
    return null
  }
}

/**
 * Run an agent-browser CLI command with session isolation
 */
async function runBrowserCommand(
  args: string[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  sessionOverride?: string,
): Promise<string> {
  const sessionId = sessionOverride || getBrowserSessionId()

  // System users (e.g. `lazarus`) have no XDG_RUNTIME_DIR and no
  // /run/user/<uid>, so the daemon's default socket location fails with
  // "Permission denied". Pin the socket dir under HOME/.cache, which is
  // lazarus-writable, so the daemon can spawn its IPC socket.
  const home = process.env.HOME || '/mnt/sdc'
  const socketDir = process.env.AGENT_BROWSER_SOCKET_DIR || `${home}/.cache/agent-browser`
  await fs.mkdir(socketDir, { recursive: true }).catch((err) => {
    log.debug({ err, socketDir }, 'agent-browser socket dir mkdir best-effort')
  })

  // agent-browser bundles its own Playwright pinned to a specific browser
  // version (e.g. chromium_headless_shell-1208), but we install browsers via
  // @playwright/mcp's install-browser command which may resolve to a different
  // version. Reuse whichever chrome-headless-shell is already on disk under
  // ~/.cache/ms-playwright/ so the two tools share a single browser cache.
  const executablePath =
    process.env.AGENT_BROWSER_EXECUTABLE_PATH || (await findPlaywrightHeadlessShell(home))

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    AGENT_BROWSER_SESSION: sessionId,
    AGENT_BROWSER_SOCKET_DIR: socketDir,
    ...(executablePath && { AGENT_BROWSER_EXECUTABLE_PATH: executablePath }),
  }

  try {
    const { stdout, stderr } = await execFileAsync('agent-browser', args, {
      env,
      timeout: timeoutMs,
      maxBuffer: MAX_OUTPUT_BYTES,
      cwd: getWorkspacePath(),
    })
    // agent-browser outputs to stdout; stderr may have warnings
    return (stdout || '').trim() || (stderr || '').trim()
  } catch (error: any) {
    // execFile errors include stdout/stderr on the error object
    const output = (error.stdout || '').trim() || (error.stderr || '').trim()
    if (output) {
      throw new Error(`agent-browser error: ${output}`)
    }
    throw new Error(`agent-browser error: ${error.message}`)
  }
}

/**
 * JSON helper for tool responses
 */
function jsonResult(data: Record<string, unknown>) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  }
}

export const browserTools = [
  // Open URL
  tool(
    'browser_open',
    "Navigate to a URL in a headless browser. This starts a new browser session if one isn't running. Returns the page title and URL.",
    {
      url: z.string().describe("The URL to navigate to (e.g., 'https://example.com')"),
    },
    async (args) => {
      try {
        const sessionId = getBrowserSessionId()

        // Concurrency check
        if (
          !browserSessionManager.getActiveCount() ||
          !browserSessionManager['activeSessions'].has(sessionId)
        ) {
          if (browserSessionManager.getActiveCount() >= MAX_BROWSER_SESSIONS) {
            return jsonResult({
              success: false,
              error: `Maximum concurrent browser sessions (${MAX_BROWSER_SESSIONS}) reached. Close an existing session first.`,
            })
          }
          browserSessionManager.registerSession(sessionId)
        }

        const output = await runBrowserCommand(['open', args.url])
        return jsonResult({ success: true, output, sessionId })
      } catch (error: any) {
        return jsonResult({ success: false, error: error.message })
      }
    },
  ),

  // Snapshot (accessibility tree)
  tool(
    'browser_snapshot',
    'Get the accessibility tree of the current page with element refs (like @e1, @e2). Use these refs with click, type, fill, etc. Use -i for interactive elements only.',
    {
      interactive: z
        .boolean()
        .optional()
        .describe('Only show interactive elements (buttons, links, inputs). Default: false'),
      compact: z.boolean().optional().describe('Remove empty structural elements. Default: false'),
    },
    async (args) => {
      try {
        const cmdArgs = ['snapshot']
        if (args.interactive) cmdArgs.push('-i')
        if (args.compact) cmdArgs.push('-c')

        const output = await runBrowserCommand(cmdArgs, 15_000)
        return jsonResult({ success: true, snapshot: output })
      } catch (error: any) {
        return jsonResult({ success: false, error: error.message })
      }
    },
  ),

  // Screenshot
  tool(
    'browser_screenshot',
    'Take a screenshot of the current page. Returns the file path to the saved screenshot.',
    {
      fullPage: z
        .boolean()
        .optional()
        .describe('Capture full page (not just viewport). Default: false'),
    },
    async (args) => {
      try {
        const workspacePath = getWorkspacePath()
        const screenshotDir = path.join(workspacePath, 'generated', 'screenshots')
        await fs.mkdir(screenshotDir, { recursive: true })

        const filename = `screenshot_${Date.now()}.png`
        const fullPath = path.join(screenshotDir, filename)

        const cmdArgs = ['screenshot', fullPath]
        if (args.fullPage) cmdArgs.push('--full')

        await runBrowserCommand(cmdArgs, 15_000)

        return jsonResult({
          success: true,
          path: `generated/screenshots/${filename}`,
          full_path: fullPath,
        })
      } catch (error: any) {
        return jsonResult({ success: false, error: error.message })
      }
    },
  ),

  // Click
  tool(
    'browser_click',
    'Click an element by its ref (e.g., @e1 from snapshot) or CSS selector.',
    {
      ref: z.string().describe("Element ref from snapshot (e.g., '@e1') or CSS selector"),
    },
    async (args) => {
      try {
        const output = await runBrowserCommand(['click', args.ref])
        return jsonResult({ success: true, output })
      } catch (error: any) {
        return jsonResult({ success: false, error: error.message })
      }
    },
  ),

  // Type
  tool(
    'browser_type',
    'Type text into an element (appends to existing text). Use fill instead to clear first.',
    {
      ref: z.string().describe("Element ref from snapshot (e.g., '@e3') or CSS selector"),
      text: z.string().describe('Text to type into the element'),
    },
    async (args) => {
      try {
        const output = await runBrowserCommand(['type', args.ref, args.text])
        return jsonResult({ success: true, output })
      } catch (error: any) {
        return jsonResult({ success: false, error: error.message })
      }
    },
  ),

  // Fill
  tool(
    'browser_fill',
    'Clear an input field and fill it with new text. Use this instead of type when you want to replace existing content.',
    {
      ref: z.string().describe("Element ref from snapshot (e.g., '@e3') or CSS selector"),
      text: z.string().describe('Text to fill into the element (replaces existing content)'),
    },
    async (args) => {
      try {
        const output = await runBrowserCommand(['fill', args.ref, args.text])
        return jsonResult({ success: true, output })
      } catch (error: any) {
        return jsonResult({ success: false, error: error.message })
      }
    },
  ),

  // Select
  tool(
    'browser_select',
    'Select an option from a dropdown/select element.',
    {
      ref: z.string().describe("Element ref from snapshot (e.g., '@e5') or CSS selector"),
      value: z.string().describe('The value or visible text of the option to select'),
    },
    async (args) => {
      try {
        const output = await runBrowserCommand(['select', args.ref, args.value])
        return jsonResult({ success: true, output })
      } catch (error: any) {
        return jsonResult({ success: false, error: error.message })
      }
    },
  ),

  // Scroll
  tool(
    'browser_scroll',
    'Scroll the page in a direction.',
    {
      direction: z.enum(['up', 'down', 'left', 'right']).describe('Direction to scroll'),
      pixels: z.number().optional().describe('Number of pixels to scroll. Default: page height'),
    },
    async (args) => {
      try {
        const cmdArgs = ['scroll', args.direction]
        if (args.pixels !== undefined) cmdArgs.push(String(args.pixels))

        const output = await runBrowserCommand(cmdArgs)
        return jsonResult({ success: true, output })
      } catch (error: any) {
        return jsonResult({ success: false, error: error.message })
      }
    },
  ),

  // Get text
  tool(
    'browser_get_text',
    'Extract the text content of an element.',
    {
      ref: z.string().describe("Element ref from snapshot (e.g., '@e1') or CSS selector"),
    },
    async (args) => {
      try {
        const output = await runBrowserCommand(['get', 'text', args.ref])
        return jsonResult({ success: true, text: output })
      } catch (error: any) {
        return jsonResult({ success: false, error: error.message })
      }
    },
  ),

  // Wait
  tool(
    'browser_wait',
    'Wait for an element to appear (CSS selector) or wait for a specified time in milliseconds.',
    {
      target: z
        .string()
        .describe("CSS selector to wait for, or number of milliseconds to wait (e.g., '2000')"),
    },
    async (args) => {
      try {
        // Determine timeout based on whether it's a wait-for-time or wait-for-element
        const isMs = /^\d+$/.test(args.target)
        const timeoutMs = isMs ? Math.min(parseInt(args.target, 10) + 5000, 60_000) : 30_000

        const output = await runBrowserCommand(['wait', args.target], timeoutMs)
        return jsonResult({ success: true, output })
      } catch (error: any) {
        return jsonResult({ success: false, error: error.message })
      }
    },
  ),

  // Press key
  tool(
    'browser_press',
    'Press a keyboard key (e.g., Enter, Tab, Escape, Control+a, ArrowDown).',
    {
      key: z
        .string()
        .describe("Key to press (e.g., 'Enter', 'Tab', 'Escape', 'Control+a', 'ArrowDown')"),
    },
    async (args) => {
      try {
        const output = await runBrowserCommand(['press', args.key])
        return jsonResult({ success: true, output })
      } catch (error: any) {
        return jsonResult({ success: false, error: error.message })
      }
    },
  ),

  // Close browser
  tool(
    'browser_close',
    'Close the browser and end the browsing session. Always call this when done browsing to free resources.',
    {},
    async () => {
      try {
        const sessionId = getBrowserSessionId()
        await browserSessionManager.cleanupSession(sessionId)
        return jsonResult({ success: true, message: 'Browser session closed.' })
      } catch (error: any) {
        return jsonResult({ success: false, error: error.message })
      }
    },
  ),
]

export const browserToolsServer = createSdkMcpServer({
  name: 'browser-tools',
  version: '1.0.0',
  tools: browserTools,
})

export function createBrowserToolsServer() {
  return createSdkMcpServer({ name: 'browser-tools', version: '1.0.0', tools: browserTools })
}
