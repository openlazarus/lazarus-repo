import { execFile } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs/promises'
import { createLogger } from '@utils/logger'

const log = createLogger('preset-installers')
const exec = promisify(execFile)

export type TPresetInstallResult = {
  ran: boolean
  durationMs: number
  output?: string
  error?: string
}

/**
 * Some presets require host-side dependencies that aren't shipped with the
 * preset config (e.g. Playwright needs a browser binary in the runtime
 * filesystem). When a workspace adds such a preset, the controller calls the
 * matching installer here so the MCP just works on first launch.
 *
 * Installers must be idempotent — they may be called every time a workspace
 * adds the preset, including when the dependency is already cached.
 */
export type TPresetInstaller = () => Promise<TPresetInstallResult>

const PLAYWRIGHT_INSTALL_TIMEOUT_MS = 5 * 60 * 1000 // 5 min for first-time download

/**
 * Ensure browser cache + socket dirs exist under HOME before install runs.
 * On a fresh deploy the lazarus service user often has HOME pointing at a
 * mount root (e.g. /mnt/sdc) where the cache subdir doesn't exist yet — left
 * unhandled, `npx playwright install` fails with EACCES on `~/.cache`.
 */
const ensureBrowserCacheDirs = async (): Promise<void> => {
  const home = process.env.HOME
  if (!home) throw new Error('HOME env var is not set; cannot locate browser cache dir')
  await fs.mkdir(path.join(home, '.cache', 'ms-playwright'), { recursive: true })
  await fs.mkdir(path.join(home, '.cache', 'agent-browser'), { recursive: true })
}

const installPlaywrightChromium = async (): Promise<TPresetInstallResult> => {
  const startedAt = Date.now()
  try {
    await ensureBrowserCacheDirs()
    const { stdout, stderr } = await exec(
      'npx',
      ['-y', '@playwright/mcp@latest', 'install-browser', 'chromium'],
      {
        timeout: PLAYWRIGHT_INSTALL_TIMEOUT_MS,
        env: { ...process.env, NODE_ENV: 'production' },
        maxBuffer: 16 * 1024 * 1024,
      },
    )
    const durationMs = Date.now() - startedAt
    const output = `${stdout}\n${stderr}`.trim()
    log.info({ durationMs, output }, 'Playwright Chromium install complete')
    return { ran: true, durationMs, output }
  } catch (err) {
    const durationMs = Date.now() - startedAt
    const error = err instanceof Error ? err.message : String(err)
    log.error({ durationMs, error }, 'Playwright Chromium install failed')
    return { ran: true, durationMs, error }
  }
}

const PRESET_INSTALLERS: Record<string, TPresetInstaller> = {
  playwright: installPlaywrightChromium,
}

export const getPresetInstaller = (presetId: string): TPresetInstaller | undefined =>
  PRESET_INSTALLERS[presetId]

export const runPresetInstaller = async (
  presetId: string,
): Promise<TPresetInstallResult | null> => {
  const installer = getPresetInstaller(presetId)
  if (!installer) return null
  return installer()
}
