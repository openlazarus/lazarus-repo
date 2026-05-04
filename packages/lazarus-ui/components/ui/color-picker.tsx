'use client'

import * as m from 'motion/react-m'

import { WORKSPACE_COLORS } from '@/lib/design-system/workspace-colors'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  /** Currently selected color (hex string) */
  value?: string | null
  /** Callback when a color is selected */
  onChange: (color: string) => void
  /** Optional custom color palette (defaults to WORKSPACE_COLORS) */
  colors?: readonly string[]
  /** Size of color buttons */
  size?: 'sm' | 'md'
  /** Additional class names */
  className?: string
}

const sizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
}

export function ColorPicker({
  value,
  onChange,
  colors = WORKSPACE_COLORS,
  size = 'md',
  className,
}: ColorPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {colors.map((color, index) => {
        const isSelected = value === color

        return (
          <m.button
            key={color}
            type='button'
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.2,
              delay: index * 0.02,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileTap={{ opacity: 0.8 }}
            onClick={(e) => {
              e.stopPropagation()
              onChange(color)
            }}
            className={cn(
              'rounded-full transition-all duration-200',
              sizeClasses[size],
              isSelected &&
                'scale-110 ring-2 ring-current ring-offset-2 ring-offset-background',
            )}
            style={
              {
                backgroundColor: color,
                // Use the color itself for the ring
                '--tw-ring-color': isSelected ? color : undefined,
              } as React.CSSProperties
            }
            aria-label={`Select color ${color}`}
            aria-pressed={isSelected}
          />
        )
      })}
    </div>
  )
}
