import {
  RiBox3Line,
  RiCodeLine,
  RiDatabase2Line,
  RiFileLine,
  RiFileTextLine,
  RiFileZipLine,
  RiImageLine,
  RiMusicLine,
  RiPresentationLine,
  RiVideoLine,
} from '@remixicon/react'

import { cn } from '@/lib/utils'

import { FileType } from './file-type-detector'

interface FilePreviewProps {
  fileName: string
  fileType: FileType
  className?: string
}

export function FilePreview({
  fileName,
  fileType,
  className,
}: FilePreviewProps) {
  const renderPreview = () => {
    switch (fileType) {
      case 'knowledge_graph':
        return (
          <div className='flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400'>
            <RiBox3Line className='mb-4 h-16 w-16 text-[#0098FC]' />
            <p className='mb-2 text-lg font-medium'>Memory package</p>
            <p className='text-sm'>{fileName}</p>
            <p className='mt-2 text-xs'>
              Open to explore artifacts, concepts, and connections
            </p>
          </div>
        )

      case 'v0_project':
        return (
          <div className='flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400'>
            <RiCodeLine className='mb-4 h-16 w-16 text-purple-500' />
            <p className='mb-2 text-lg font-medium'>v0 Project</p>
            <p className='text-sm'>{fileName}</p>
            <p className='mt-2 text-xs'>
              Open this file to view and edit the v0 project
            </p>
          </div>
        )

      case 'sqlite_database':
        return (
          <div className='flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400'>
            <RiDatabase2Line className='mb-4 h-16 w-16 text-blue-500' />
            <p className='mb-2 text-lg font-medium'>SQLite Database</p>
            <p className='text-sm'>{fileName}</p>
            <p className='mt-2 text-xs'>
              Open this file to browse and query the database
            </p>
          </div>
        )

      case 'slides':
        return (
          <div className='flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400'>
            <RiPresentationLine className='mb-4 h-16 w-16' />
            <p className='mb-2 text-lg font-medium'>Presentation File</p>
            <p className='text-sm'>{fileName}</p>
            <p className='mt-2 text-xs'>
              Open this file to view the presentation
            </p>
          </div>
        )

      case 'image':
        return (
          <div className='flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400'>
            <RiImageLine className='mb-4 h-16 w-16' />
            <p className='mb-2 text-lg font-medium'>Image File</p>
            <p className='text-sm'>{fileName}</p>
            <p className='mt-2 text-xs'>Open this file to view the image</p>
          </div>
        )

      case 'video':
        return (
          <div className='flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400'>
            <RiVideoLine className='mb-4 h-16 w-16' />
            <p className='mb-2 text-lg font-medium'>Video File</p>
            <p className='text-sm'>{fileName}</p>
            <p className='mt-2 text-xs'>Video preview coming soon</p>
          </div>
        )

      case 'audio':
        return (
          <div className='flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400'>
            <RiMusicLine className='mb-4 h-16 w-16' />
            <p className='mb-2 text-lg font-medium'>Audio File</p>
            <p className='text-sm'>{fileName}</p>
            <p className='mt-2 text-xs'>Audio preview coming soon</p>
          </div>
        )

      case 'pdf':
        return (
          <div className='flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400'>
            <RiFileTextLine className='mb-4 h-16 w-16 text-red-500' />
            <p className='mb-2 text-lg font-medium'>PDF Document</p>
            <p className='text-sm'>{fileName}</p>
            <p className='mt-2 text-xs'>
              Open this file to view the PDF document
            </p>
          </div>
        )

      case 'binary':
        return (
          <div className='flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400'>
            <RiFileZipLine className='mb-4 h-16 w-16' />
            <p className='mb-2 text-lg font-medium'>Binary File</p>
            <p className='text-sm'>{fileName}</p>
            <p className='mt-2 text-xs'>This file type cannot be edited</p>
          </div>
        )

      case 'unsupported':
      default:
        return (
          <div className='flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400'>
            <RiFileLine className='mb-4 h-16 w-16' />
            <p className='mb-2 text-lg font-medium'>Unsupported File</p>
            <p className='text-sm'>{fileName}</p>
            <p className='mt-2 text-xs'>This file type is not supported yet</p>
          </div>
        )
    }
  }

  return <div className={cn('h-full w-full', className)}>{renderPreview()}</div>
}
