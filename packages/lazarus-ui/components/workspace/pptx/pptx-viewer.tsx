'use client'

import { RiSlideshowLine } from '@remixicon/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import { fileService } from '@/app/(main)/files/components/services/file.service'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/ui/spinner'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

interface PptxViewerProps {
  workspaceId: string
  filePath: string
  fileName: string
}

export function PptxViewer({
  workspaceId,
  filePath,
  fileName,
}: PptxViewerProps) {
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slides, setSlides] = useState<string[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)

  const isLegacyPpt =
    fileName.toLowerCase().endsWith('.ppt') &&
    !fileName.toLowerCase().endsWith('.pptx')

  useEffect(() => {
    if (isLegacyPpt || !workspaceId) return

    async function loadPptx() {
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
        const { pptxToHtml } = await import('@jvmr/pptx-to-html')

        const slideHtmlArray = await pptxToHtml(arrayBuffer, {
          width: 960,
          height: 540,
          scaleToFit: true,
        })

        setSlides(slideHtmlArray)
        setCurrentSlide(0)
      } catch (err: any) {
        console.error('Error loading PPTX file:', err)
        setError(err?.message || 'Failed to load PowerPoint presentation')
      } finally {
        setLoading(false)
      }
    }

    loadPptx()
  }, [filePath, workspaceId, isLegacyPpt])

  if (isLegacyPpt) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <RiSlideshowLine className='h-12 w-12 text-muted-foreground' />
          <p className='text-sm font-medium'>
            Legacy .ppt format is not supported
          </p>
          <p className='text-xs text-muted-foreground'>
            Please convert the file to .pptx format using Microsoft PowerPoint
            or Google Slides.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <Spinner size='md' />
          <p className='text-sm text-muted-foreground'>
            Loading presentation...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <RiSlideshowLine className='h-12 w-12 text-muted-foreground' />
          <p className='text-sm text-destructive'>Error: {error}</p>
        </div>
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <p className='text-sm text-muted-foreground'>
          No slides found in presentation
        </p>
      </div>
    )
  }

  return (
    <div className='flex h-full w-full flex-col'>
      {/* Navigation bar */}
      <div
        className={cn(
          'flex flex-shrink-0 items-center justify-between border-b px-4 py-2',
          isDark
            ? 'border-white/10 bg-[#1a1a1b]'
            : 'border-black/10 bg-gray-50',
        )}>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
            disabled={currentSlide === 0}>
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <span className='text-sm'>
            Slide {currentSlide + 1} of {slides.length}
          </span>
          <Button
            variant='ghost'
            size='sm'
            onClick={() =>
              setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))
            }
            disabled={currentSlide === slides.length - 1}>
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Slide content */}
      <div
        className={cn(
          'flex flex-1 items-center justify-center overflow-auto p-4',
          isDark ? 'bg-[#2a2a2b]' : 'bg-gray-100',
        )}>
        <div
          className='slide-container'
          style={{
            width: '960px',
            maxWidth: '100%',
            aspectRatio: '16 / 9',
            background: 'white',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative',
          }}
          dangerouslySetInnerHTML={{ __html: slides[currentSlide] }}
        />
      </div>
    </div>
  )
}
