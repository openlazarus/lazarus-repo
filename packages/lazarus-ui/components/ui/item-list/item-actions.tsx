'use client'

import { RiDeleteBinLine, RiEdit2Line, RiPriceTag3Line } from '@remixicon/react'
import * as m from 'motion/react-m'
import { memo, useRef } from 'react'

import { handleTagAction } from '@/components/ui/button/tag-button'
import { AtSignIcon } from '@/components/ui/icons/at-sign'
import {
  ArrowBigLeftDashIcon,
  ArrowBigLeftDashIconHandle,
} from '@/components/ui/icons/open-left'
import { useTagger } from '@/hooks/core/use-tagger'
import { Item } from '@/model'
import { useUIState } from '@/state/ui-state'

import { ItemAction } from './index'

interface ItemActionsProps {
  item: Item
  actions?: ItemAction[]
  onMainAction: () => void
  onTag?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onShowLabelManager?: () => void
  isProcessing?: boolean
}

// iOS-style ease curves
const EXPAND_EASE = [0.25, 1, 0.5, 1]
const TAP_EASE = [0.25, 0.46, 0.45, 0.94] // Apple's ease-in-out curve

const ActionButton = memo(
  ({
    onClick,
    disabled = false,
    icon,
    label,
    colorClasses = 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-400',
    actionId,
  }: {
    onClick: (e: React.MouseEvent) => void
    disabled?: boolean
    icon: React.ReactNode
    label: string
    colorClasses?: string
    actionId?: string
  }) => {
    const iconRef = useRef<ArrowBigLeftDashIconHandle>(null)

    const handleClick = (e: React.MouseEvent) => {
      // Trigger icon animation for open action
      if (actionId === 'open' && iconRef.current) {
        iconRef.current.startAnimation()
        // Stop animation after a delay
        setTimeout(() => {
          iconRef.current?.stopAnimation()
        }, 600)
      }
      onClick(e)
    }

    return (
      <m.button
        onClick={handleClick}
        disabled={disabled}
        className={`flex flex-col items-center rounded-lg p-3 transition-colors ${
          disabled
            ? 'cursor-not-allowed bg-gray-100 text-gray-400 opacity-50 dark:bg-[#161617] dark:text-gray-600'
            : colorClasses
        }`}
        whileTap={disabled ? {} : { scale: 0.92 }}
        transition={{
          type: 'tween',
          duration: 0.15,
          ease: TAP_EASE,
        }}>
        {actionId === 'open' ? (
          <ArrowBigLeftDashIcon ref={iconRef} size={20} />
        ) : (
          icon
        )}
        <span className='mt-2 whitespace-nowrap text-[11px]'>{label}</span>
      </m.button>
    )
  },
)

ActionButton.displayName = 'ActionButton'

// Get icon for action
const getActionIcon = (actionId: string, itemId?: string) => {
  switch (actionId) {
    case 'open':
      return <ArrowBigLeftDashIcon size={20} />
    case 'tag':
      return <AtSignIcon itemId={itemId || ''} size={20} />
    case 'edit':
      return <RiEdit2Line size={20} />
    case 'labels':
      return <RiPriceTag3Line size={20} />
    case 'delete':
      return <RiDeleteBinLine size={20} />
    default:
      return <ArrowBigLeftDashIcon size={20} />
  }
}

// Get color classes for action
const getActionColorClasses = (actionId: string, isTagged?: boolean) => {
  switch (actionId) {
    case 'open':
      return 'bg-white dark:bg-[#161617] text-[#0098FC] dark:text-[#4DB8FF]'
    case 'tag':
      return isTagged
        ? 'bg-[#0098FC]/15 dark:bg-[#0098FC]/25 text-[#0098FC] dark:text-[#4DB8FF] ring-1 ring-[#0098FC]/20 dark:ring-[#0098FC]/30'
        : 'bg-white dark:bg-[#161617] text-gray-600 dark:text-gray-400'
    case 'delete':
      return 'bg-white dark:bg-[#161617] text-red-500 dark:text-red-400'
    default:
      return 'bg-white dark:bg-[#161617] text-gray-600 dark:text-gray-400'
  }
}

export const ItemActions = memo(
  ({
    item,
    actions = [],
    onMainAction,
    onTag: _onTag,
    onEdit,
    onDelete,
    onShowLabelManager,
    isProcessing = false,
  }: ItemActionsProps) => {
    const { isItemTagged } = useTagger()
    const { activeConversationId } = useUIState()

    const isTagged = isItemTagged('current', item.id)
    const isCurrent =
      item.type === 'conversation' && activeConversationId === item.id
    const isApp = item.type === 'app'

    const handleEvent = (handler?: () => void) => (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!isProcessing && handler) {
        handler()
      }
    }

    // Filter visible actions
    const visibleActions = actions.filter((action) => {
      if (action.hidden && action.hidden(item)) return false
      if (action.disabled && action.disabled(item)) return false
      return true
    })

    return (
      <m.div
        initial={{
          height: 0,
          opacity: 0,
        }}
        animate={{
          height: 'auto',
          opacity: 1,
          transition: {
            height: {
              duration: 0.3,
              ease: EXPAND_EASE,
            },
            opacity: {
              duration: 0.2,
              delay: 0.05,
            },
          },
        }}
        exit={{
          height: 0,
          opacity: 0,
          transition: {
            height: {
              duration: 0.25,
              ease: EXPAND_EASE,
            },
            opacity: {
              duration: 0.15,
            },
          },
        }}
        className='overflow-hidden border-t border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/10'
        onClick={(e) => e.stopPropagation()}>
        <div
          className={`grid gap-3 p-4 ${isTagged ? 'bg-[#0098FC]/5 dark:bg-[#0098FC]/10' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${Math.min(visibleActions.length, 5)}, 1fr)`,
          }}>
          {visibleActions.map((action) => {
            const handleActionClick = (e: React.MouseEvent) => {
              e.stopPropagation()
              console.log('Action clicked:', action.id, action.label)
              if (isProcessing) return

              // Handle actions based on their ID and available handlers
              switch (action.id) {
                case 'tag':
                  if (action.onClick) {
                    // Use handleTagAction to trigger animation on all instances
                    handleTagAction(
                      item.id,
                      () => action.onClick!(item),
                      isCurrent,
                    )
                  }
                  break
                case 'edit':
                  if (onEdit) {
                    onEdit()
                  }
                  break
                case 'delete':
                  if (onDelete) {
                    onDelete()
                  }
                  break
                case 'labels':
                  if (onShowLabelManager) {
                    onShowLabelManager()
                  }
                  break
                default:
                  // For other actions (open), use the action's onClick
                  if (action.onClick) {
                    action.onClick(item)
                  }
                  break
              }
            }

            return (
              <ActionButton
                key={action.id}
                onClick={handleActionClick}
                disabled={
                  isProcessing || (action.disabled && action.disabled(item))
                }
                icon={getActionIcon(action.id, item.id)}
                label={action.label || action.id}
                colorClasses={getActionColorClasses(action.id, isTagged)}
                actionId={action.id}
              />
            )
          })}
        </div>
      </m.div>
    )
  },
)

ItemActions.displayName = 'ItemActions'
