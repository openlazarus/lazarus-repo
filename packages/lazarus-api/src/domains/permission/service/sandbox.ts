import * as path from 'path'
import * as fs from 'fs'
import type { IWorkspaceSandbox } from './sandbox.interface'

const STORAGE_BASE = (process.env.STORAGE_BASE_PATH ?? '/mnt/sdc/storage').replace(/\/?$/, '/')

export class WorkspaceSandbox implements IWorkspaceSandbox {
  private allowedRoots: string[]
  private workspacePath: string

  constructor(workspacePath: string, additionalPaths?: string[]) {
    this.workspacePath = workspacePath
    this.allowedRoots = [fs.realpathSync(workspacePath)]

    for (const p of additionalPaths ?? []) {
      try {
        const resolved = fs.realpathSync(p)
        if (resolved.startsWith(STORAGE_BASE)) {
          this.allowedRoots.push(resolved)
        }
      } catch {
        /* skip non-existent */
      }
    }
  }

  isPathAllowed(targetPath: string): boolean {
    try {
      const absolute = path.isAbsolute(targetPath)
        ? targetPath
        : path.resolve(this.workspacePath, targetPath)

      const resolved = fs.existsSync(absolute)
        ? fs.realpathSync(absolute)
        : this.resolvePartial(absolute)

      return this.allowedRoots.some(
        (root) => resolved === root || resolved.startsWith(root + path.sep),
      )
    } catch {
      return false
    }
  }

  private resolvePartial(targetPath: string): string {
    const segments = targetPath.split(path.sep)
    for (let i = segments.length; i > 0; i--) {
      const partial = segments.slice(0, i).join(path.sep) || '/'
      if (fs.existsSync(partial)) {
        const base = fs.realpathSync(partial)
        const rest = segments.slice(i).join(path.sep)
        return rest ? path.join(base, rest) : base
      }
    }
    return targetPath
  }
}
