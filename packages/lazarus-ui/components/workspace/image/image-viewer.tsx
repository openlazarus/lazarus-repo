'use client'

import {
  RiDownloadLine,
  RiFullscreenLine,
  RiZoomInLine,
  RiZoomOutLine,
} from '@remixicon/react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

import { fileService } from '@/app/(main)/files/components/services/file.service'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/ui/spinner'

interface ImageViewerProps {
  filePath: string
  fileName: string
  workspaceId?: string
}

interface ImageMetadata {
  width: number
  height: number
  size: number
  type: string
}

export function ImageViewer({
  filePath,
  fileName,
  workspaceId,
}: ImageViewerProps) {
  const [loading, setLoading] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null)
  const [zoom, setZoom] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    async function loadImage() {
      if (!workspaceId) {
        setError('Workspace ID is required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Remove workspace ID prefix from file path if present
        const cleanPath = filePath.includes('/')
          ? filePath.split('/').slice(1).join('/')
          : filePath

        const response = await fileService.readFile(
          'user', // scope is ignored in new implementation
          workspaceId,
          cleanPath,
          '', // userId no longer used
        )

        if (response.encoding === 'base64') {
          // Get file extension to determine MIME type
          const ext = fileName.split('.').pop()?.toLowerCase()
          const mimeTypes: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
            bmp: 'image/bmp',
            ico: 'image/x-icon',
          }
          const mimeType = mimeTypes[ext || 'png'] || 'image/png'

          // Convert base64 to data URL
          const dataUrl = `data:${mimeType};base64,${response.content}`
          setImageUrl(dataUrl)

          // Load image to get dimensions
          const img = document.createElement('img')
          img.onload = () => {
            setMetadata({
              width: img.naturalWidth,
              height: img.naturalHeight,
              size: response.size || 0,
              type: ext || 'unknown',
            })
          }
          img.src = dataUrl
        } else {
          setError('Invalid image encoding')
        }
      } catch (err: any) {
        console.error('Error loading image:', err)
        setError(err?.message || 'Failed to load image')
      } finally {
        setLoading(false)
      }
    }

    loadImage()
  }, [filePath, workspaceId, fileName])

  function handleZoomIn() {
    setZoom((prev) => Math.min(prev + 25, 400))
  }

  function handleZoomOut() {
    setZoom((prev) => Math.max(prev - 25, 25))
  }

  function handleResetZoom() {
    setZoom(100)
  }

  function handleFullscreen() {
    setIsFullscreen(!isFullscreen)
  }

  function handleDownload() {
    if (!imageUrl) return

    const link = document.createElement('a')
    link.href = imageUrl
    link.download = fileName
    link.click()
  }

  if (loading) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <Spinner size='md' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-2'>
          <p className='text-sm text-destructive'>Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex h-full w-full flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Toolbar */}
      <div className='flex items-center justify-between border-b bg-background px-4 py-2'>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='small'
            onClick={handleZoomOut}
            disabled={zoom <= 25}>
            <RiZoomOutLine className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='small'
            onClick={handleResetZoom}
            disabled={zoom === 100}>
            <span className='text-sm'>{zoom}%</span>
          </Button>
          <Button
            variant='outline'
            size='small'
            onClick={handleZoomIn}
            disabled={zoom >= 400}>
            <RiZoomInLine className='h-4 w-4' />
          </Button>
          <div className='ml-4 h-4 w-px bg-border' />
          <Button variant='outline' size='small' onClick={handleFullscreen}>
            <RiFullscreenLine className='h-4 w-4' />
          </Button>
          <Button variant='outline' size='small' onClick={handleDownload}>
            <RiDownloadLine className='h-4 w-4' />
          </Button>
        </div>
        <div className='flex items-center gap-4'>
          {metadata && (
            <div className='text-sm text-muted-foreground'>
              {metadata.width} × {metadata.height} •{' '}
              {(metadata.size / 1024).toFixed(1)} KB •{' '}
              {metadata.type.toUpperCase()}
            </div>
          )}
          <div className='text-sm text-muted-foreground'>{fileName}</div>
        </div>
      </div>

      {/* Image Display */}
      <div className='flex-1 overflow-auto bg-[repeating-linear-gradient(45deg,#0000_0_10px,#8882_10px_20px)]'>
        <div className='flex min-h-full items-center justify-center p-8'>
          {imageUrl && (
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transition: 'transform 0.2s ease-out',
              }}>
              <Image
                src={imageUrl}
                alt={fileName}
                width={metadata?.width || 800}
                height={metadata?.height || 600}
                className='rounded-lg shadow-2xl'
                style={{
                  maxWidth: 'none',
                  height: 'auto',
                }}
                unoptimized
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
