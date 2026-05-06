'use client'

import { useEffect, useState } from 'react'

import { useReadFile } from './use-read-file'

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  wav: 'audio/wav',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

export const useDownloadFile = (
  workspaceId: string,
  filePath: string,
  fileName: string,
) => {
  const [pending, setPending] = useState(false)
  const { data } = useReadFile(workspaceId, filePath, { enabled: pending })

  useEffect(() => {
    if (!data || !pending) return

    let blob: Blob
    if (data.encoding === 'base64') {
      const binaryString = atob(data.content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++)
        bytes[i] = binaryString.charCodeAt(i)
      const ext = fileName.split('.').pop()?.toLowerCase() || ''
      blob = new Blob([bytes], {
        type: MIME_MAP[ext] || 'application/octet-stream',
      })
    } else {
      blob = new Blob([data.content], { type: 'text/plain' })
    }

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    setPending(false)
  }, [data, pending, fileName])

  return () => setPending(true)
}
