'use client'

import * as m from 'motion/react-m'

import { Attachment } from '../hooks/use-attachments'

// Paperclip icon — distinguishes attachments from tags
const PaperclipIcon = () => (
  <svg
    className='h-3.5 w-3.5 flex-shrink-0'
    style={{ color: 'hsl(var(--lazarus-blue))' }}
    fill='none'
    viewBox='0 0 24 24'
    stroke='currentColor'
    strokeWidth={2}>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      d='M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'
    />
  </svg>
)

interface AttachmentPillProps {
  attachment: Attachment
  onRemove: (id: string) => void
}

/** Compact pill that renders inline alongside tag pills */
export function AttachmentPill({ attachment, onRemove }: AttachmentPillProps) {
  const { file, preview, type } = attachment

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className='flex items-center gap-1.5 rounded-md bg-[#0098FC]/10 px-2 py-1'>
      {/* Paperclip icon — visual marker for attachments */}
      <PaperclipIcon />

      {/* Thumbnail for images, or just the filename */}
      {preview && type === 'image' && (
        <img
          src={preview}
          alt={file.name}
          className='h-3.5 w-3.5 flex-shrink-0 rounded-sm object-cover'
        />
      )}

      {/* File name */}
      <span className='max-w-[120px] truncate text-[13px] font-medium text-[#0098FC]'>
        {file.name}
      </span>

      {/* Remove button — matches tag X icon */}
      <button
        onClick={() => onRemove(attachment.id)}
        className='flex-shrink-0 text-[#0098FC]/60 transition-colors hover:text-[#0098FC]'
        aria-label='Remove attachment'>
        <svg
          width={12}
          height={12}
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'>
          <line x1='18' y1='6' x2='6' y2='18' />
          <line x1='6' y1='6' x2='18' y2='18' />
        </svg>
      </button>
    </m.div>
  )
}
