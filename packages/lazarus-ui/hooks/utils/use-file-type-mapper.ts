import { useCallback } from 'react'

import { FileType } from '@/model/file'

/**
 * Hook that provides utilities for mapping MIME types to FileType values
 */
export const useFileTypeMapper = () => {
  /**
   * Maps a MIME type string to a FileType
   */
  const getFileTypeFromMimeType = useCallback((mimeType: string): FileType => {
    // Handle image types
    if (mimeType.startsWith('image/')) return 'image'

    // Handle video types
    if (mimeType.startsWith('video/')) return 'video'

    // Handle audio types
    if (mimeType.startsWith('audio/')) return 'audio'

    // Handle specific document types
    const mimeTypeMap: Record<string, FileType> = {
      'application/pdf': 'pdf',
      'text/plain': 'document',
      'text/html': 'code',
      'text/css': 'code',
      'text/javascript': 'code',
      'application/javascript': 'code',
      'application/json': 'code',
      'application/xml': 'code',
      'text/xml': 'code',
      'application/zip': 'archive',
      'application/x-rar-compressed': 'archive',
      'application/x-7z-compressed': 'archive',
      'application/x-tar': 'archive',
      'application/gzip': 'archive',
      // Microsoft Office
      'application/msword': 'document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'document',
      'application/vnd.ms-excel': 'table',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        'table',
      'application/vnd.ms-powerpoint': 'slides',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        'slides',
      // Google Docs
      'application/vnd.google-apps.document': 'document',
      'application/vnd.google-apps.spreadsheet': 'table',
      'application/vnd.google-apps.presentation': 'slides',
      // OpenDocument formats
      'application/vnd.oasis.opendocument.text': 'document',
      'application/vnd.oasis.opendocument.spreadsheet': 'table',
      'application/vnd.oasis.opendocument.presentation': 'slides',
      // iWork formats
      'application/x-iwork-pages-sffpages': 'document',
      'application/x-iwork-numbers-sffnumbers': 'table',
      'application/x-iwork-keynote-sffkey': 'slides',
      // Programming languages
      'text/x-python': 'code',
      'text/x-java': 'code',
      'text/x-c': 'code',
      'text/x-c++': 'code',
      'text/x-csharp': 'code',
      'text/x-ruby': 'code',
      'text/x-go': 'code',
      'text/x-rust': 'code',
      'text/x-swift': 'code',
      'text/x-kotlin': 'code',
      'text/x-typescript': 'code',
      'application/x-httpd-php': 'code',
      // Markdown
      'text/markdown': 'document',
      'text/x-markdown': 'document',
    }

    return mimeTypeMap[mimeType] || 'other'
  }, [])

  /**
   * Gets a FileType from a file extension
   */
  const getFileTypeFromExtension = useCallback((filename: string): FileType => {
    const extension = filename.split('.').pop()?.toLowerCase()

    const extensionMap: Record<string, FileType> = {
      // Documents
      doc: 'document',
      docx: 'document',
      odt: 'document',
      rtf: 'document',
      txt: 'document',
      md: 'document',
      // Spreadsheets
      xls: 'table',
      xlsx: 'table',
      ods: 'table',
      csv: 'table',
      // Presentations
      ppt: 'slides',
      pptx: 'slides',
      odp: 'slides',
      // PDF
      pdf: 'pdf',
      // Images
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      svg: 'image',
      webp: 'image',
      bmp: 'image',
      ico: 'image',
      // Videos
      mp4: 'video',
      avi: 'video',
      mov: 'video',
      wmv: 'video',
      flv: 'video',
      webm: 'video',
      mkv: 'video',
      // Audio
      mp3: 'audio',
      wav: 'audio',
      flac: 'audio',
      aac: 'audio',
      ogg: 'audio',
      wma: 'audio',
      m4a: 'audio',
      // Archives
      zip: 'archive',
      rar: 'archive',
      '7z': 'archive',
      tar: 'archive',
      gz: 'archive',
      bz2: 'archive',
      // Code
      js: 'code',
      ts: 'code',
      jsx: 'code',
      tsx: 'code',
      py: 'code',
      java: 'code',
      c: 'code',
      cpp: 'code',
      cs: 'code',
      rb: 'code',
      go: 'code',
      rs: 'code',
      swift: 'code',
      kt: 'code',
      php: 'code',
      html: 'code',
      css: 'code',
      scss: 'code',
      sass: 'code',
      less: 'code',
      json: 'code',
      xml: 'code',
      yaml: 'code',
      yml: 'code',
      toml: 'code',
      sql: 'code',
      sh: 'code',
      bash: 'code',
      ps1: 'code',
    }

    return extensionMap[extension || ''] || 'other'
  }, [])

  /**
   * Determines FileType from either MIME type or filename
   * Tries MIME type first, falls back to extension
   */
  const getFileType = useCallback(
    (file: { type?: string; name: string }): FileType => {
      // Try MIME type first if available
      if (file.type) {
        const typeFromMime = getFileTypeFromMimeType(file.type)
        if (typeFromMime !== 'other') {
          return typeFromMime
        }
      }

      // Fall back to extension
      return getFileTypeFromExtension(file.name)
    },
    [getFileTypeFromMimeType, getFileTypeFromExtension],
  )

  return {
    getFileTypeFromMimeType,
    getFileTypeFromExtension,
    getFileType,
  }
}
