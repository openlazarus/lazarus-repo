'use client'

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import { fileService } from '@/app/(main)/files/components/services/file.service'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/ui/spinner'

// Dynamic import to avoid SSR issues with pdfjs
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false },
)

const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), {
  ssr: false,
})

interface PdfViewerProps {
  workspaceId: string
  filePath: string
  fileName: string
}

export function PdfViewer({ workspaceId, filePath, fileName }: PdfViewerProps) {
  const [loading, setLoading] = useState(true)
  const [pdfData, setPdfData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)

  // Configure worker on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-pdf').then((mod) => {
        mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`
      })
    }
  }, [])

  useEffect(() => {
    async function loadPdf() {
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
          'user', // scope is ignored
          workspaceId,
          cleanPath,
          '', // userId no longer used
        )

        if (response.encoding === 'base64') {
          // Convert base64 to data URL for react-pdf
          setPdfData(`data:application/pdf;base64,${response.content}`)
        } else {
          setError('Invalid PDF encoding')
        }
      } catch (err: any) {
        console.error('Error loading PDF:', err)
        setError(err?.message || 'Failed to load PDF')
      } finally {
        setLoading(false)
      }
    }

    loadPdf()
  }, [filePath, workspaceId])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error)
    setError('Failed to load PDF document')
  }

  function goToPreviousPage() {
    setPageNumber((prev) => Math.max(prev - 1, 1))
  }

  function goToNextPage() {
    setPageNumber((prev) => Math.min(prev + 1, numPages))
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
    <div className='flex h-full w-full flex-col'>
      {/* Navigation Controls */}
      <div className='flex items-center justify-between border-b bg-background px-4 py-2'>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}>
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <span className='text-sm'>
            Page {pageNumber} of {numPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}>
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
        <div className='text-sm text-muted-foreground'>{fileName}</div>
      </div>

      {/* PDF Document */}
      <div className='flex-1 overflow-auto bg-gray-100'>
        <div className='flex justify-center p-4'>
          {pdfData && (
            <Document
              file={pdfData}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className='flex items-center justify-center p-8'>
                  <Loader2 className='h-8 w-8 animate-spin' />
                </div>
              }>
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className='shadow-lg'
              />
            </Document>
          )}
        </div>
      </div>
    </div>
  )
}
