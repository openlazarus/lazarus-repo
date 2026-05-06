'use client'

import {
  RiAddLine,
  RiAlertLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Spinner from '@/components/ui/spinner'
import { useLabels } from '@/hooks/core/use-labels'
import { useGetLabels } from '@/hooks/features/labels/use-get-labels'
import { useClickAway } from '@/hooks/ui/interaction/use-click-away'
import { Item } from '@/model/item'
import { Label } from '@/model/label'
import { useStoreEssentials } from '@/state/store'

// Predefined label colors
const LABEL_COLORS = [
  '#0098FC', // Blue
  '#BF5AF2', // Purple
  '#FF375F', // Red
  '#FE9F0C', // Orange
  '#FFCC00', // Yellow
  '#31D158', // Green
]

// Helper function to convert hex to rgba
function hexToRgba(hex: string | undefined | null, alpha: number = 1): string {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#'))
    return hex || '#000000'

  let r = 0,
    g = 0,
    b = 0

  // 3 digits
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16)
    g = parseInt(hex[2] + hex[2], 16)
    b = parseInt(hex[3] + hex[3], 16)
  }
  // 6 digits
  else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16)
    g = parseInt(hex.slice(3, 5), 16)
    b = parseInt(hex.slice(5, 7), 16)
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Animation ease curve - matches iOS styles
const EXPAND_EASE = [0.25, 1, 0.5, 1]

// Check if we're on mobile for performance optimizations
const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

// Delete confirmation for labels
const DeleteLabelConfirmation = ({
  label,
  onDelete,
  onCancel,
}: {
  label: Label
  onDelete: () => void
  onCancel: () => void
}) => {
  return (
    <m.div
      initial={{ height: 0, opacity: 0 }}
      animate={{
        height: 'auto',
        opacity: 1,
        transition: {
          height: {
            duration: isMobile ? 0.15 : 0.25,
            ease: EXPAND_EASE,
          },
          opacity: {
            duration: isMobile ? 0.1 : 0.2,
            delay: isMobile ? 0 : 0.05,
          },
        },
      }}
      exit={{
        height: 0,
        opacity: 0,
        transition: {
          height: {
            duration: isMobile ? 0.1 : 0.2,
            ease: EXPAND_EASE,
          },
          opacity: {
            duration: isMobile ? 0.1 : 0.15,
          },
        },
      }}
      className='overflow-hidden border-t border-gray-100 bg-gray-50/80 backdrop-blur-[1px]'
      onClick={(e) => e.stopPropagation()}>
      <div className='p-4'>
        <div className='mb-3 flex items-center text-sm font-medium text-gray-800'>
          <RiAlertLine className='mr-1.5 text-red-500' /> Delete label "
          {label.name}"?
        </div>
        <div className='flex gap-2'>
          <m.button
            whileTap={isMobile ? undefined : { scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={onDelete}
            className='flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white transition-colors'>
            Delete
          </m.button>
          <m.button
            whileTap={isMobile ? undefined : { scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={onCancel}
            className='flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-800 transition-colors'>
            Cancel
          </m.button>
        </div>
      </div>
    </m.div>
  )
}

interface LabelManagerProps {
  item: Item
  onClose: () => void
}

export function LabelManager({ item, onClose }: LabelManagerProps) {
  const { activeWorkspaceId } = useStoreEssentials()
  const { labelItem, unlabelItem, createLabel, deleteLabel } = useLabels()

  // Use useGetLabels directly for reactive updates
  const { labels: workspaceLabels, loading: labelsLoading } = useGetLabels(
    activeWorkspaceId || '',
  )

  const [isCreating, setIsCreating] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [selectedColor, setSelectedColor] = useState(LABEL_COLORS[0]) // Default blue
  const [labelToDelete, setLabelToDelete] = useState<Label | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Use click away hook to close when clicking outside
  useClickAway({
    refs: containerRef,
    handler: (event) => {
      // If we're creating a label, just cancel the creation
      if (isCreating) {
        setIsCreating(false)
        setNewLabelName('')
        return
      }

      // Only close the entire manager if not in delete confirmation mode
      if (!labelToDelete) {
        onClose()
      }
    },
  })

  // Get current item labels from labels - use server-side joined data
  const currentItemLabels = useMemo(() => {
    return item.labels || []
  }, [item.labels])

  const currentLabelIds = useMemo(() => {
    return currentItemLabels.map((label) => label.id)
  }, [currentItemLabels])

  const handleToggleLabel = useCallback(
    async (labelId: string) => {
      if (currentLabelIds.includes(labelId)) {
        const result = await unlabelItem(item.id, labelId, item.type)
      } else {
        const result = await labelItem(item.id, labelId, item.type)
      }
    },
    [item.id, item.type, currentLabelIds, labelItem, unlabelItem],
  )

  const handleCreateLabel = useCallback(async () => {
    if (!newLabelName.trim()) return

    // Optimistically close the create UI
    setIsCreating(false)
    const tempName = newLabelName.trim()
    const tempColor = selectedColor
    setNewLabelName('')

    try {
      const label = await createLabel(tempName, tempColor)
      if (label) {
        // Automatically apply the new label to the item
        // Pass the label data for optimistic updates
        await labelItem(item.id, label.id, item.type, label)
      }
    } catch (error) {
      console.error('Failed to create label:', error)
      // Reopen the create UI on error
      setIsCreating(true)
      setNewLabelName(tempName)
      setSelectedColor(tempColor)
    }
  }, [newLabelName, selectedColor, createLabel, item, labelItem])

  const handleDeleteClick = useCallback((e: React.MouseEvent, label: Label) => {
    e.stopPropagation()
    setLabelToDelete(label)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (labelToDelete) {
      deleteLabel(labelToDelete.id)
      setLabelToDelete(null)
    }
  }, [labelToDelete, deleteLabel])

  const handleCancelDelete = useCallback(() => {
    setLabelToDelete(null)
  }, [])

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  return (
    <div
      ref={containerRef}
      className='border-t border-gray-100 bg-gray-50/80 p-4 backdrop-blur-[1px]'>
      <div className='mb-3 flex items-center justify-between'>
        <h3 className='text-sm font-medium'>Labels</h3>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className='rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600'>
          <RiCloseLine size={16} />
        </button>
      </div>

      {/* All labels */}
      <div className='mb-4'>
        {labelsLoading ? (
          <div className='flex items-center justify-center py-4'>
            <Spinner size='sm' />
          </div>
        ) : workspaceLabels.length > 0 ? (
          <div className='flex flex-wrap gap-2'>
            {workspaceLabels.map((label) => {
              const isApplied = currentLabelIds.includes(label.id)

              return (
                <m.div
                  key={label.id}
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 28,
                    mass: 0.7,
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all ${
                    isApplied
                      ? 'pr-1.5'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{
                    backgroundColor: isApplied
                      ? hexToRgba(label.color, 0.15)
                      : '',
                    color: isApplied ? label.color : '',
                    boxShadow: isApplied
                      ? `0 0 0 1px ${hexToRgba(label.color, 0.3)}`
                      : '',
                  }}>
                  <m.button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleLabel(label.id)
                    }}
                    whileTap={{
                      scale: 0.98,
                      transition: { duration: 0.05 },
                    }}
                    className='flex items-center gap-1.5'>
                    <m.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 600,
                        damping: 30,
                        delay: 0.1,
                      }}
                      className='h-2.5 w-2.5 rounded-full'
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </m.button>

                  {/* System-wide delete button for applied labels */}
                  {isApplied && (
                    <m.button
                      onClick={(e) => handleDeleteClick(e, label)}
                      whileTap={{
                        scale: 0.9,
                        transition: { duration: 0.05 },
                      }}
                      className='ml-1 rounded-full p-0.5 hover:bg-white/30'>
                      <RiDeleteBinLine
                        size={12}
                        style={{ color: label.color }}
                      />
                    </m.button>
                  )}
                </m.div>
              )
            })}
          </div>
        ) : (
          <p className='text-xs text-gray-500'>No labels in this workspace</p>
        )}
      </div>

      {/* Delete confirmation */}
      {labelToDelete && (
        <DeleteLabelConfirmation
          label={labelToDelete}
          onDelete={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      {/* Create new label UI */}
      {isCreating && !labelToDelete ? (
        <div className='space-y-3 rounded-lg border border-gray-200 p-3'>
          <div className='flex items-center gap-2'>
            <span
              className='h-4 w-4 rounded-full'
              style={{ backgroundColor: selectedColor }}
            />
            <input
              ref={inputRef}
              type='text'
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder='Label name'
              className='flex-1 bg-transparent text-sm focus:outline-none'
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: '16px', // Ensure font size is at least 16px to prevent zoom
                touchAction: 'manipulation', // Prevents browser-initiated zooming
                WebkitTextSizeAdjust: '100%', // Prevents iOS auto text size adjustment
                transform: 'translateZ(0)', // Force hardware acceleration
                WebkitAppearance: 'none', // Removes iOS styling that can cause zoom
                WebkitFontSmoothing: 'antialiased', // Better text rendering
                MozOsxFontSmoothing: 'grayscale', // Better text rendering in Firefox
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateLabel()
                if (e.key === 'Escape') {
                  setIsCreating(false)
                  setNewLabelName('')
                }
              }}
              // Add autoComplete attribute to prevent browser zoom on iOS
              autoComplete='off'
              // Prevent auto capitalization
              autoCapitalize='none'
              // Prevent auto correction
              autoCorrect='off'
              // Prevent spell checking
              spellCheck='false'
            />
          </div>

          {/* Color picker */}
          <div className='flex flex-wrap gap-2'>
            {LABEL_COLORS.map((color) => (
              <button
                key={color}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedColor(color)
                }}
                className={`h-5 w-5 rounded-full ${
                  selectedColor === color ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  backgroundColor: color,
                  // Apply ring color using the selected color
                  boxShadow:
                    selectedColor === color ? `0 0 0 1px ${color}` : '',
                }}
              />
            ))}
          </div>

          {/* Actions */}
          <div className='flex justify-end gap-2'>
            <m.button
              whileTap={{
                scale: 0.97,
                backgroundColor: 'rgb(224, 226, 230)',
                transition: { duration: 0.1 },
              }}
              onClick={(e) => {
                e.stopPropagation()
                setIsCreating(false)
                setNewLabelName('')
              }}
              className='flex h-8 items-center gap-1 rounded-md bg-gray-100 px-3.5 text-xs font-medium text-gray-700 shadow-sm transition-all'
              style={{
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
              }}>
              Cancel
            </m.button>
            <m.button
              whileTap={{
                scale: 0.97,
                backgroundColor: 'rgb(0, 126, 219)',
                transition: { duration: 0.1 },
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleCreateLabel()
              }}
              disabled={!newLabelName.trim()}
              className='flex h-8 items-center gap-1.5 rounded-md bg-[#0098FC] px-3.5 text-xs font-medium text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-white'
              style={{
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
              }}>
              <RiCheckLine
                size={14}
                className='relative'
                style={{ top: '-0.5px' }}
              />
              Create
            </m.button>
          </div>
        </div>
      ) : !labelToDelete ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsCreating(true)
          }}
          className='flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-600 hover:border-[#0098FC]/30 hover:bg-[#0098FC]/5 hover:text-[#0098FC]'>
          <RiAddLine size={14} />
          Create new label
        </button>
      ) : null}
    </div>
  )
}

// Export the helper function
export { hexToRgba }
