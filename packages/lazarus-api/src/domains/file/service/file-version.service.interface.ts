import type { FileVersion } from '@domains/file/types/file.types'

export interface IFileVersionService {
  /** Save a new version of a file. */
  saveVersion(
    workspacePath: string,
    filePath: string,
    content: string,
    modifiedBy: string,
    modifierType: 'user' | 'bot' | 'agent',
    message?: string,
  ): Promise<FileVersion>

  /** Get all versions of a file. */
  getVersions(workspacePath: string, filePath: string): Promise<FileVersion[]>

  /** Get a specific version by ID. */
  getVersion(
    workspacePath: string,
    filePath: string,
    versionId: string,
  ): Promise<FileVersion | null>

  /** Delete a specific version. */
  deleteVersion(workspacePath: string, filePath: string, versionId: string): Promise<boolean>

  /** Get the number of versions for a file. */
  getVersionCount(workspacePath: string, filePath: string): Promise<number>

  /** Check if a file has any versions. */
  hasVersions(workspacePath: string, filePath: string): Promise<boolean>
}
