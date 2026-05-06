import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import type { FileVersion } from '@domains/file/types/file.types'
import type { IFileVersionService } from './file-version.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('file-version')

export class FileVersionService implements IFileVersionService {
  private readonly maxVersions: number

  constructor(maxVersions: number = 50) {
    this.maxVersions = maxVersions
  }

  /**
   * Generate a unique version ID
   */
  private generateVersionId(): string {
    return `v${Date.now()}${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Calculate SHA-256 checksum of content
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  /**
   * Get version directory path for a file
   */
  private getVersionDir(workspacePath: string, filePath: string): string {
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath
    return path.join(workspacePath, '.versions', normalizedPath)
  }

  /**
   * Save a new version of a file
   */
  async saveVersion(
    workspacePath: string,
    filePath: string,
    content: string,
    modifiedBy: string,
    modifierType: 'user' | 'bot' | 'agent',
    message?: string,
  ): Promise<FileVersion> {
    const versionId = this.generateVersionId()
    const timestamp = new Date().toISOString()
    const checksum = this.calculateChecksum(content)
    const size = Buffer.byteLength(content, 'utf-8')

    const version: FileVersion = {
      versionId,
      path: filePath,
      timestamp,
      modifiedBy,
      modifierType,
      size,
      checksum,
      content,
      message,
    }

    // Create version directory
    const versionDir = this.getVersionDir(workspacePath, filePath)
    await fs.mkdir(versionDir, { recursive: true })

    // Write version file
    const versionFilePath = path.join(versionDir, `${versionId}.json`)
    await fs.writeFile(versionFilePath, JSON.stringify(version, null, 2), 'utf-8')

    // Cleanup old versions
    await this.cleanupOldVersions(versionDir)

    return version
  }

  /**
   * Get all versions of a file
   */
  async getVersions(workspacePath: string, filePath: string): Promise<FileVersion[]> {
    const versionDir = this.getVersionDir(workspacePath, filePath)

    try {
      const files = await fs.readdir(versionDir)
      const versions: FileVersion[] = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          const versionFilePath = path.join(versionDir, file)
          const content = await fs.readFile(versionFilePath, 'utf-8')
          const version = JSON.parse(content) as FileVersion
          versions.push(version)
        }
      }

      // Sort by timestamp descending (newest first)
      return versions.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [] // No versions yet
      }
      throw error
    }
  }

  /**
   * Get a specific version
   */
  async getVersion(
    workspacePath: string,
    filePath: string,
    versionId: string,
  ): Promise<FileVersion | null> {
    const versionDir = this.getVersionDir(workspacePath, filePath)
    const versionFilePath = path.join(versionDir, `${versionId}.json`)

    try {
      const content = await fs.readFile(versionFilePath, 'utf-8')
      return JSON.parse(content) as FileVersion
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null
      }
      throw error
    }
  }

  /**
   * Delete a specific version
   */
  async deleteVersion(
    workspacePath: string,
    filePath: string,
    versionId: string,
  ): Promise<boolean> {
    const versionDir = this.getVersionDir(workspacePath, filePath)
    const versionFilePath = path.join(versionDir, `${versionId}.json`)

    try {
      await fs.unlink(versionFilePath)
      return true
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false
      }
      throw error
    }
  }

  /**
   * Cleanup old versions keeping only the most recent maxVersions
   */
  private async cleanupOldVersions(versionDir: string): Promise<void> {
    try {
      const files = await fs.readdir(versionDir)
      const versionFiles = files.filter((f) => f.endsWith('.json'))

      if (versionFiles.length <= this.maxVersions) {
        return
      }

      // Get file stats and sort by modification time
      const fileStats = await Promise.all(
        versionFiles.map(async (file) => {
          const filePath = path.join(versionDir, file)
          const stats = await fs.stat(filePath)
          return { file, mtime: stats.mtime }
        }),
      )

      // Sort oldest first
      fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime())

      // Delete oldest files
      const toDelete = fileStats.slice(0, fileStats.length - this.maxVersions)
      for (const { file } of toDelete) {
        await fs.unlink(path.join(versionDir, file))
      }
    } catch (error) {
      log.error({ err: error }, 'Failed to cleanup old versions')
      // Don't throw - cleanup is best effort
    }
  }

  /**
   * Get version count for a file
   */
  async getVersionCount(workspacePath: string, filePath: string): Promise<number> {
    const versions = await this.getVersions(workspacePath, filePath)
    return versions.length
  }

  /**
   * Check if file has versions
   */
  async hasVersions(workspacePath: string, filePath: string): Promise<boolean> {
    const count = await this.getVersionCount(workspacePath, filePath)
    return count > 0
  }
}

// Export singleton instance
export const fileVersionService: IFileVersionService = new FileVersionService()
