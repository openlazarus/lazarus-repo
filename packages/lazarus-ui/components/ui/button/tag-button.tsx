'use client'

import { memo, useCallback } from 'react'

import {
  AtSignIcon,
  triggerAtSignAnimation,
} from '@/components/ui/icons/at-sign'

interface TagButtonProps {
  itemId: string
  isTagged: boolean
  size?: 'small' | 'large'
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
}

export const TagButton = memo(
  ({
    itemId,
    isTagged,
    size = 'small',
    onClick,
    disabled = false,
  }: TagButtonProps) => {
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!disabled) {
          triggerAtSignAnimation(itemId)
          onClick(e)
        }
      },
      [onClick, disabled, itemId],
    )

    const handleMouseEnter = useCallback(() => {
      if (!disabled) {
        triggerAtSignAnimation(itemId)
      }
    }, [disabled, itemId])

    return (
      <button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        disabled={disabled}
        className={`flex ${
          size === 'small' ? 'h-6 w-6' : 'h-auto w-auto flex-col items-center'
        } ${
          disabled
            ? 'cursor-not-allowed opacity-40'
            : size === 'large'
              ? isTagged
                ? 'rounded-lg bg-[#0098FC]/10 p-3 text-[#0098FC] dark:bg-[#0098FC]/20 dark:text-[#4DB8FF]'
                : 'rounded-lg bg-[#0098FC]/5 p-3 text-[#0098FC] hover:bg-[#0098FC]/10 dark:bg-[#0098FC]/10 dark:text-[#4DB8FF] dark:hover:bg-[#0098FC]/20'
              : isTagged
                ? 'items-center justify-center rounded-full bg-[#0098FC]/20 text-[#0098FC] dark:bg-[#0098FC]/25 dark:text-[#4DB8FF]'
                : 'items-center justify-center rounded-full text-[#0098FC] hover:bg-[#0098FC]/10 dark:text-[#4DB8FF] dark:hover:bg-[#0098FC]/15'
        }`}>
        <AtSignIcon itemId={itemId} size={size === 'small' ? 14 : 20} />
        {size === 'large' && (
          <span className='mt-2 whitespace-nowrap text-[11px]'>
            {disabled ? 'Current Chat' : isTagged ? 'Tagged' : 'Tag item'}
          </span>
        )}
      </button>
    )
  },
)
TagButton.displayName = 'TagButton'

// Export a helper function to trigger animation and handle tag click
export const handleTagAction = (
  itemId: string,
  onClick: () => void,
  isCurrent?: boolean,
) => {
  if (!isCurrent) {
    triggerAtSignAnimation(itemId)
    onClick()
  }
}
