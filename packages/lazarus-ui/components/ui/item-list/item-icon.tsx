'use client'

import { RiAppsLine, RiMessageLine } from '@remixicon/react'
import { Box } from 'lucide-react'
import Image from 'next/image'
import { memo } from 'react'

import { useTagger } from '@/hooks/core/use-tagger'
import { getFileTypeIconComponent } from '@/lib/file-icons'
import { App, File, Item } from '@/model'
import { getAppIcon, getAppIconColor, getAppIconType } from '@/model/app'

interface ItemIconProps {
  item: Item
}

export const ItemIcon = memo(({ item }: ItemIconProps) => {
  const { isItemTagged } = useTagger()
  const isTagged = isItemTagged('current', item.id)

  // Use a consistent background color for all icons, but add a blue effect for tagged items
  const iconBgColor = isTagged
    ? 'bg-gradient-to-br from-[#0098FC]/20 to-[#0098FC]/10 dark:from-[#0098FC]/30 dark:to-[#0098FC]/20 border border-[#0098FC]/30 dark:border-[#0098FC]/40'
    : 'bg-gray-50 dark:bg-white/[0.03]'

  // For apps, use the app icon functions from model/app.ts
  if (item.type === 'app') {
    const app = item as App
    const iconType = getAppIconType(app.app_type as any)
    const iconPath = getAppIcon(app.app_type as any)
    const iconColor = getAppIconColor(app.app_type as any)

    return (
      <div
        className={`z-20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconBgColor} transition-colors duration-300`}
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
        {iconType === 'component' ? (
          <Image src={iconPath} alt={item.name || ''} width={18} height={18} />
        ) : (
          <i
            className={`${iconPath} text-lg ${iconColor} dark:brightness-110`}></i>
        )}
      </div>
    )
  }

  // For files, determine the icon based on file type
  if (item.type === 'file') {
    const file = item as File
    const fileType = file.fileType || 'document'

    return (
      <div
        className={`z-20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconBgColor} transition-colors duration-300`}
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
        {fileType === 'knowledge_graph' ? (
          <Box className='h-7 w-7 text-[#0098FC]' />
        ) : (
          getFileTypeIconComponent(fileType, 'h-7 w-7')
        )}
      </div>
    )
  }

  // For conversations, use chat icon
  return (
    <div
      className={`z-20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconBgColor} transition-colors duration-300`}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
      {item.type === 'conversation' ? (
        <RiMessageLine className='h-7 w-7 text-[#0098FC]' />
      ) : (
        <RiAppsLine className='h-7 w-7 text-gray-600 dark:text-gray-400' />
      )}
    </div>
  )
})

ItemIcon.displayName = 'ItemIcon'
