import { api } from '@/lib/api-client'

const buildWorkspaceUrl = (workspaceId: string, path: string): string => {
  const override = process.env.NEXT_PUBLIC_WORKSPACE_API_URL
  if (override) return `${override}${path}`
  const baseDomain =
    process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN || 'localhost'
  return `https://${workspaceId}.${baseDomain}${path}`
}

// Alias kept so callers below are readable
const ws = buildWorkspaceUrl

export const MAX_PREVIEW_BYTES = 1 * 1024 * 1024

export class FileTooLargeError extends Error {
  constructor(
    public size: number | null,
    public limit: number = MAX_PREVIEW_BYTES,
  ) {
    super('file_too_large')
    this.name = 'FileTooLargeError'
  }
}

export type ScopeType = 'user' | 'team' | 'agent'

export interface FileInfo {
  name: string
  path: string
  size: number
  sizeKB: number
  sizeMB?: number
  modified: string
  created?: string
  isDirectory: boolean
  isFile: boolean
  fileCount?: number
  dirCount?: number
  totalItems?: number
}

export interface FileListResponse {
  path: string
  files: FileInfo[]
  count: number
}

export interface FileContent {
  path: string
  content: string
  size: number
  encoding: string
}

export interface FileStats {
  path: string
  isDirectory: boolean
  isFile: boolean
  size: number
  sizeKB: number
  sizeMB: number
  fileCount?: number
  dirCount?: number
  totalItems?: number
  created: string
  modified: string
  accessed?: string
}

export interface BatchUploadFile {
  path: string
  content: string
  encoding?: string
}

export interface SearchResult {
  path: string
  type: 'file' | 'directory'
  size: number
  modified: string
}

export interface WorkspaceInfo {
  path: string
  totalSize: number
  sizeKB: number
  sizeMB: number
  fileCount: number
  dirCount: number
  lastModified: string
}

class FileService {
  // Read file content using workspace ID
  async readFile(
    scope: ScopeType,
    id: string,
    filePath: string,
    userId: string,
    teamId?: string,
  ): Promise<FileContent> {
    // scope is ignored - we use workspace ID (id parameter) directly
    // Remove leading slash for API path
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath

    try {
      return await api.get<FileContent>(ws(id, '/api/files/workspace/read'), {
        params: { path: cleanPath },
      })
    } catch (err: any) {
      if (err?.message === 'file_too_large') {
        throw new FileTooLargeError(null)
      }
      throw err
    }
  }

  // Write file using workspace ID
  async writeFile(
    scope: ScopeType,
    id: string,
    filePath: string,
    content: string,
    userId: string,
    teamId?: string,
    encoding: string = 'utf-8',
    modifierType: string = 'user',
    modifierId?: string,
  ): Promise<{
    success: boolean
    message?: string
    path: string
    size: number
    modified?: string
    modifiedBy?: string
    versionId?: string
  }> {
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath

    return api.post(ws(id, '/api/files/workspace/write'), {
      path: cleanPath,
      content,
      encoding,
    })
  }

  // List files in workspace
  async listFiles(
    scope: ScopeType,
    id: string,
    path: string = '/',
    userId: string,
    teamId?: string,
  ): Promise<FileListResponse> {
    return api.get<FileListResponse>(ws(id, '/api/files/workspace'), {
      params: { path },
    })
  }

  // Delete file or directory
  async deleteFile(
    scope: ScopeType,
    id: string,
    path: string,
    userId: string,
    teamId?: string,
  ): Promise<{ success: boolean; message: string; path?: string }> {
    return api.delete(ws(id, '/api/files/workspace'), { params: { path } })
  }

  // Helper method to determine file type from extension
  getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    const typeMap: Record<string, string> = {
      // Documents
      txt: 'text',
      md: 'markdown',
      doc: 'document',
      docx: 'document',
      pdf: 'pdf',

      // Code
      js: 'javascript',
      ts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      cs: 'csharp',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',

      // Data
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      csv: 'csv',
      sql: 'sql',

      // Images
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      svg: 'image',
      webp: 'image',

      // Media
      mp3: 'audio',
      wav: 'audio',
      mp4: 'video',
      avi: 'video',
      mov: 'video',

      // Archives
      zip: 'archive',
      tar: 'archive',
      gz: 'archive',
      rar: 'archive',

      // Other
      html: 'html',
      css: 'css',
      scss: 'css',
      less: 'css',
    }

    return typeMap[ext || ''] || 'file'
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get file version history
  async getFileHistory(
    scope: ScopeType,
    id: string,
    path: string,
    userId: string,
    teamId?: string,
  ): Promise<{
    path: string
    versions: Array<{
      versionId: string
      timestamp: string
      modifiedBy: string
      modifierType: 'user' | 'bot' | 'agent'
      size: number
      checksum: string
      message?: string
    }>
    count: number
  }> {
    return api.get(ws(id, '/api/files/workspace/history'), { params: { path } })
  }

  // Get specific version content
  async getFileVersion(
    scope: ScopeType,
    id: string,
    path: string,
    versionId: string,
    userId: string,
    teamId?: string,
  ): Promise<{
    versionId: string
    path: string
    timestamp: string
    modifiedBy: string
    modifierType: 'user' | 'bot' | 'agent'
    size: number
    checksum: string
    content: string
    message?: string
  }> {
    return api.get(ws(id, `/api/files/workspace/version/${versionId}`), {
      params: { path },
    })
  }

  // Restore file version
  async restoreFileVersion(
    scope: ScopeType,
    id: string,
    path: string,
    versionId: string,
    userId: string,
    teamId?: string,
  ): Promise<{
    success: boolean
    path: string
    restoredFrom: string
    newVersionId: string
    size: number
    modified: string
    message: string
  }> {
    return api.post(ws(id, '/api/files/workspace/restore'), { path, versionId })
  }
}

export const fileService = new FileService()
