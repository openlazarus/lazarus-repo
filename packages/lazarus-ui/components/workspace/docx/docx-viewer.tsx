'use client'

import { RiFileWordLine } from '@remixicon/react'
import { useEffect, useRef, useState } from 'react'

import { fileService } from '@/app/(main)/files/components/services/file.service'
import Spinner from '@/components/ui/spinner'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

interface DocxViewerProps {
  workspaceId: string
  filePath: string
  fileName: string
}

export function DocxViewer({
  workspaceId,
  filePath,
  fileName,
}: DocxViewerProps) {
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Check for legacy .doc format
  const isLegacyDoc =
    fileName.toLowerCase().endsWith('.doc') &&
    !fileName.toLowerCase().endsWith('.docx')

  useEffect(() => {
    if (isLegacyDoc || !workspaceId) return

    async function loadDocx() {
      try {
        setLoading(true)
        setError(null)

        const cleanPath = filePath.includes('/')
          ? filePath.split('/').slice(1).join('/')
          : filePath

        const response = await fileService.readFile(
          'user',
          workspaceId,
          cleanPath,
          '',
        )

        if (response.encoding !== 'base64') {
          setError('Invalid file encoding. Expected binary file.')
          setLoading(false)
          return
        }

        // Decode base64 to ArrayBuffer
        const binaryString = atob(response.content)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const arrayBuffer = bytes.buffer

        // Dynamic import to avoid SSR issues
        const { renderAsync } = await import('docx-preview')

        if (containerRef.current) {
          containerRef.current.innerHTML = ''

          await renderAsync(arrayBuffer, containerRef.current, undefined, {
            className: 'docx-preview-wrapper',
            inWrapper: true,
            breakPages: true,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
          })
        }
      } catch (err: any) {
        console.error('Error loading DOCX file:', err)
        setError(err?.message || 'Failed to load Word document')
      } finally {
        setLoading(false)
      }
    }

    loadDocx()
  }, [filePath, workspaceId, isLegacyDoc])

  if (isLegacyDoc) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <RiFileWordLine className='h-12 w-12 text-muted-foreground' />
          <p className='text-sm font-medium'>
            Legacy .doc format is not supported
          </p>
          <p className='text-xs text-muted-foreground'>
            Please convert the file to .docx format using Microsoft Word or
            Google Docs.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <RiFileWordLine className='h-12 w-12 text-muted-foreground' />
          <p className='text-sm text-destructive'>Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col',
        isDark ? 'bg-[#2a2a2b]' : 'bg-white',
      )}>
      {/* Loading overlay */}
      {loading && (
        <div className='absolute inset-0 z-10 flex h-full w-full items-center justify-center'>
          <div className='flex flex-col items-center gap-3'>
            <Spinner size='md' />
            <p className='text-sm text-muted-foreground'>
              Loading Word document...
            </p>
          </div>
        </div>
      )}

      {/* Override docx-preview library's default gray background and padding */}
      <style>{`.docx-preview-wrapper-wrapper { background: transparent !important; padding: 0 !important; }`}</style>

      {/* Container always rendered so ref is available for renderAsync */}
      <div className={cn('flex-1 overflow-auto', loading && 'invisible')}>
        <div
          ref={containerRef}
          className='docx-container mx-auto'
          style={{ padding: 0 }}
        />
      </div>
    </div>
  )
}
