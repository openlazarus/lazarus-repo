'use client'

import {
  RiAppleFill,
  RiChat1Fill,
  RiLoopRightLine,
  RiMailFill,
  RiPhoneFill,
  RiWhatsappFill,
} from '@remixicon/react'
import Image from 'next/image'
import { memo } from 'react'

import { formatRelativeTime } from '@/lib/date-formatter'
import { Item, ItemOrigin, SyncSource } from '@/model'

// Define ItemWithUI interface locally to avoid circular imports
interface ItemWithUI extends Item {
  name?: string
  origin?: ItemOrigin
  isTagged?: boolean
  isCurrent?: boolean
}

// Source icon for conversations and files
export const SourceIcon = memo(
  ({
    source,
    type,
  }: {
    source: SyncSource | ItemOrigin
    type: 'file' | 'conversation'
  }) => {
    if (type === 'file') {
      // Handle file sync sources
      switch (source) {
        case 'gdrive':
          return (
            <span
              className='mx-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-50 dark:bg-white/[0.03]'
              title='Synced with Google Drive'>
              <Image
                src='/icons/drive-logo.svg'
                width={9}
                height={9}
                alt='Google Drive'
              />
            </span>
          )
        case 'icloud':
          return (
            <span
              className='mx-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-50 dark:bg-white/[0.03]'
              title='Synced with iCloud'>
              <RiAppleFill size={9} className='text-black' />
            </span>
          )
        default:
          return null
      }
    } else {
      // Handle conversation origins
      switch (source) {
        case 'imessage':
          return (
            <span className='mx-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-50 dark:bg-white/[0.03]'>
              <span className='flex h-2 w-2 items-center justify-center rounded-full bg-[#34C759]'>
                <RiChat1Fill size={6} className='text-white' />
              </span>
            </span>
          )
        case 'whatsapp':
          return (
            <span className='mx-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-50 dark:bg-white/[0.03]'>
              <RiWhatsappFill size={9} className='text-[#25D366]' />
            </span>
          )
        case 'phone':
          return (
            <span className='mx-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-50 dark:bg-white/[0.03]'>
              <RiPhoneFill size={9} className='text-[#0098FC]' />
            </span>
          )
        case 'email':
          return (
            <span className='mx-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-50 dark:bg-white/[0.03]'>
              <RiMailFill size={9} className='text-[#EA4335]' />
            </span>
          )
        default:
          return null
      }
    }
  },
)
SourceIcon.displayName = 'SourceIcon'

// Unified source information component for both files and conversations
export const SourceInfo = memo(({ item }: { item: ItemWithUI }) => {
  // Only show if we have a source to display
  const isFile = item.type === 'file'
  const isConversation = item.type === 'conversation'

  let showSource = false
  let sourceType: 'file' | 'conversation' = 'file'
  let sourceName = ''
  let sourceValue: SyncSource | ItemOrigin | undefined = undefined
  let sourceTime = ''

  if (
    isFile &&
    item.metadata?.syncSource &&
    item.metadata.syncSource !== 'lazarus-cloud'
  ) {
    showSource = true
    sourceType = 'file'
    sourceValue = item.metadata.syncSource
    sourceName = sourceValue === 'gdrive' ? 'Drive' : 'iCloud'
    sourceTime = item.metadata.lastSynced
      ? formatRelativeTime(item.metadata.lastSynced)
      : 'just now'
  } else if (isConversation && item.origin && item.origin !== 'app') {
    showSource = true
    sourceType = 'conversation'
    sourceValue = item.origin
    sourceName =
      sourceValue === 'imessage'
        ? 'iMessage'
        : sourceValue === 'whatsapp'
          ? 'WhatsApp'
          : sourceValue === 'email'
            ? 'Email'
            : 'Phone'
    sourceTime = formatRelativeTime(item.updatedAt)
  }

  if (!showSource || !sourceValue) return null

  return (
    <p className='flex items-center truncate pl-0 text-[11px] text-gray-400 dark:text-gray-500'>
      <RiLoopRightLine
        size={11}
        className='mr-0.5 flex-shrink-0 text-gray-500 dark:text-gray-400'
      />
      <span className='mr-0.5 flex-shrink-0'>Synced with</span>
      <SourceIcon source={sourceValue} type={sourceType} />
      <span className='truncate'>
        {sourceName} {sourceTime}
      </span>
    </p>
  )
})
SourceInfo.displayName = 'SourceInfo'
