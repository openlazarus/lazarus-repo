import { Request, Response, NextFunction } from 'express'
import * as fs from 'fs/promises'
import * as path from 'path'
import { fileVersionService } from '@domains/file/service/file-version.service'
import { eventBus } from '@realtime/events/event-bus'
import { resolveWorkspacePath } from '@domains/cache/service/workspace-path-cache'
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
  PayloadTooLargeError,
} from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const log = createLogger('files-api')

const MAX_PREVIEW_BYTES = 25 * 1024 * 1024

function sanitizePath(filePath: string): string {
  return filePath.replace(/\.\./g, '').replace(/^\//, '')
}

async function getWorkspacePath(workspaceId: string, _userId: string): Promise<string> {
  return resolveWorkspacePath(workspaceId)
}

class FilesApiController {
  async readFile(req: Request, res: Response, _next: NextFunction) {
    try {
      const workspaceId = req.workspace!.id
      const authUserId = req.user!.id
      const filePath = sanitizePath((req.query.path as string) || '')

      if (!filePath) {
        throw new BadRequestError('File path required')
      }

      const workspacePath = await getWorkspacePath(workspaceId, authUserId)
      const fullPath = path.join(workspacePath, filePath)

      const stats = await fs.stat(fullPath)
      if (stats.isDirectory()) {
        throw new BadRequestError('Cannot read directory as file')
      }

      if (stats.size > MAX_PREVIEW_BYTES) {
        throw new PayloadTooLargeError('file_too_large', filePath, stats.size, MAX_PREVIEW_BYTES)
      }

      const ext = path.extname(filePath).toLowerCase()
      const textExtensions = [
        '.txt',
        '.md',
        '.json',
        '.js',
        '.ts',
        '.tsx',
        '.jsx',
        '.py',
        '.sql',
        '.css',
        '.html',
        '.xml',
        '.csv',
        '.log',
        '.yaml',
        '.yml',
        '.toml',
        '.ini',
        '.cfg',
        '.conf',
        '.sh',
        '.bash',
        '.app',
        '.sqlite',
      ]

      if (textExtensions.includes(ext)) {
        const content = await fs.readFile(fullPath, 'utf-8')
        res.json({
          path: filePath,
          content,
          size: stats.size,
          encoding: 'utf-8',
        })
      } else {
        const content = await fs.readFile(fullPath)
        res.json({
          path: filePath,
          content: content.toString('base64'),
          size: stats.size,
          encoding: 'base64',
        })
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new NotFoundError('File')
      }
      _next(error)
    }
  }

  async writeFile(req: Request, res: Response, _next: NextFunction) {
    try {
      const workspaceId = req.workspace!.id
      const authUserId = req.user!.id
      const modifierType = (req.headers['x-modifier-type'] as string) || 'user'
      const modifierId = (req.headers['x-modifier-id'] as string) || authUserId
      const { path: filePath, content, encoding = 'utf-8', message } = req.body

      if (!filePath || content === undefined) {
        throw new BadRequestError('File path and content required')
      }

      const sanitizedPath = sanitizePath(filePath)
      const workspacePath = await getWorkspacePath(workspaceId, authUserId)
      const fullPath = path.join(workspacePath, sanitizedPath)

      let fileExisted = false

      try {
        const currentContent = await fs.readFile(fullPath, 'utf-8')
        fileExisted = true
        await fileVersionService.saveVersion(
          workspacePath,
          sanitizedPath,
          currentContent,
          `${modifierType}:${modifierId}`,
          modifierType as 'user' | 'bot' | 'agent',
          message || 'Auto-save before update',
        )
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          log.error({ err: error }, 'Failed to save version')
        }
      }

      const dir = path.dirname(fullPath)
      await fs.mkdir(dir, { recursive: true })

      if (encoding === 'base64') {
        const buffer = Buffer.from(content, 'base64')
        await fs.writeFile(fullPath, buffer)
      } else {
        await fs.writeFile(fullPath, content, encoding)
      }

      const version = await fileVersionService.saveVersion(
        workspacePath,
        sanitizedPath,
        content,
        `${modifierType}:${modifierId}`,
        modifierType as 'user' | 'bot' | 'agent',
        message || 'File updated',
      )

      const stats = await fs.stat(fullPath)
      const modifiedBy = `${modifierType}:${modifierId}`

      const fileEventType = fileExisted ? 'file:modified' : 'file:created'
      eventBus.emit(fileEventType, {
        workspaceId,
        filePath: sanitizedPath,
        userId: authUserId,
      })

      res.json({
        success: true,
        path: sanitizedPath,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        modifiedBy: modifiedBy,
        versionId: version.versionId,
        message: 'File written successfully',
      })
    } catch (error: any) {
      if (error instanceof ApiError) throw error
      throw new InternalServerError(error.message)
    }
  }

  async listFiles(req: Request, res: Response, _next: NextFunction) {
    try {
      const workspaceId = req.workspace!.id
      const authUserId = req.user!.id
      const subPath = sanitizePath((req.query.path as string) || '')

      const workspacePath = await getWorkspacePath(workspaceId, authUserId)
      const fullPath = path.join(workspacePath, subPath)

      await fs.mkdir(fullPath, { recursive: true })

      const entries = await fs.readdir(fullPath, { withFileTypes: true })
      const files = []

      for (const entry of entries) {
        const entryPath = path.join(fullPath, entry.name)
        const stats = await fs.stat(entryPath)

        files.push({
          name: entry.name,
          path: path.join(subPath, entry.name),
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
        })
      }

      res.json({
        path: subPath || '/',
        files,
        count: files.length,
      })
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        res.json({ path: req.query.path || '/', files: [], count: 0 })
      } else {
        _next(error)
      }
    }
  }

  async deleteFile(req: Request, res: Response, _next: NextFunction) {
    try {
      const workspaceId = req.workspace!.id
      const authUserId = req.user!.id
      const filePath = sanitizePath((req.query.path as string) || '')

      if (!filePath) {
        throw new BadRequestError('File path required')
      }

      const workspacePath = await getWorkspacePath(workspaceId, authUserId)
      const fullPath = path.join(workspacePath, filePath)

      const stats = await fs.stat(fullPath)

      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true })
        res.json({
          success: true,
          message: 'Directory deleted successfully',
        })
      } else {
        await fs.unlink(fullPath)
        res.json({
          success: true,
          message: 'File deleted successfully',
        })
      }
    } catch (error: any) {
      if (error instanceof ApiError) throw error
      if (error.code === 'ENOENT') {
        throw new NotFoundError('File or directory')
      }
      throw new InternalServerError(error.message)
    }
  }

  async getHistory(req: Request, res: Response, _next: NextFunction) {
    try {
      const workspaceId = req.workspace!.id
      const authUserId = req.user!.id
      const filePath = sanitizePath((req.query.path as string) || '')

      if (!filePath) {
        throw new BadRequestError('File path required')
      }

      const workspacePath = await getWorkspacePath(workspaceId, authUserId)
      const versions = await fileVersionService.getVersions(workspacePath, filePath)

      const metadata = versions.map((v) => ({
        versionId: v.versionId,
        timestamp: v.timestamp,
        modifiedBy: v.modifiedBy,
        modifierType: v.modifierType,
        size: v.size,
        checksum: v.checksum,
        message: v.message,
      }))

      res.json({
        path: filePath,
        versions: metadata,
        count: versions.length,
      })
    } catch (error: any) {
      if (error instanceof ApiError) throw error
      log.error({ err: error }, 'Failed to get file history')
      throw new InternalServerError(error.message)
    }
  }

  async getVersion(req: Request, res: Response, _next: NextFunction) {
    try {
      const workspaceId = req.workspace!.id
      const versionId = req.params.versionId!
      const authUserId = req.user!.id
      const filePath = sanitizePath((req.query.path as string) || '')

      if (!filePath) {
        throw new BadRequestError('File path required')
      }

      const workspacePath = await getWorkspacePath(workspaceId, authUserId)
      const version = await fileVersionService.getVersion(workspacePath, filePath, versionId)

      if (!version) {
        throw new NotFoundError('Version', versionId)
      }

      res.json(version)
    } catch (error: any) {
      if (error instanceof ApiError) throw error
      log.error({ err: error }, 'Failed to get file version')
      throw new InternalServerError(error.message)
    }
  }

  async restoreFile(req: Request, res: Response, _next: NextFunction) {
    try {
      const workspaceId = req.workspace!.id
      const authUserId = req.user!.id
      const modifierType = (req.headers['x-modifier-type'] as string) || 'user'
      const modifierId = (req.headers['x-modifier-id'] as string) || authUserId
      const { path: filePath, versionId } = req.body

      if (!filePath || !versionId) {
        throw new BadRequestError('File path and version ID required')
      }

      const sanitizedPath = sanitizePath(filePath)
      const workspacePath = await getWorkspacePath(workspaceId, authUserId)

      const version = await fileVersionService.getVersion(workspacePath, sanitizedPath, versionId)
      if (!version) {
        throw new NotFoundError('Version', versionId)
      }

      const fullPath = path.join(workspacePath, sanitizedPath)
      try {
        const currentContent = await fs.readFile(fullPath, 'utf-8')
        await fileVersionService.saveVersion(
          workspacePath,
          sanitizedPath,
          currentContent,
          `${modifierType}:${modifierId}`,
          modifierType as 'user' | 'bot' | 'agent',
          'Pre-restore backup',
        )
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }

      const dir = path.dirname(fullPath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(fullPath, version.content, 'utf-8')

      const newVersion = await fileVersionService.saveVersion(
        workspacePath,
        sanitizedPath,
        version.content,
        `${modifierType}:${modifierId}`,
        modifierType as 'user' | 'bot' | 'agent',
        `Restored from version ${versionId}`,
      )

      const stats = await fs.stat(fullPath)

      res.json({
        success: true,
        path: sanitizedPath,
        restoredFrom: versionId,
        newVersionId: newVersion.versionId,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        message: 'File restored successfully',
      })
    } catch (error: any) {
      if (error instanceof ApiError) throw error
      log.error({ err: error }, 'Failed to restore file')
      throw new InternalServerError(error.message)
    }
  }
}

export const filesApiController = new FilesApiController()
