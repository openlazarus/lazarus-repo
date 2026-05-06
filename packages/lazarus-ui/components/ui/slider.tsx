'use client'

import * as m from 'motion/react-m'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface SliderProps {
  label?: string
  helperText?: string
  min?: number
  max?: number
  step?: number
  value?: number
  defaultValue?: number
  onChange?: (value: number) => void
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
  isDark?: boolean
  className?: string
  showValue?: boolean
  valueFormatter?: (value: number) => string
}

export function Slider({
  label,
  helperText,
  min = 0,
  max = 1,
  step = 0.1,
  value: controlledValue,
  defaultValue = 0.5,
  onChange,
  disabled = false,
  size = 'medium',
  isDark = false,
  className = '',
  showValue = true,
  valueFormatter = (val) => val.toFixed(2),
}: SliderProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue : internalValue

  // Normalize value to percentage (0-100)
  const percentage = ((currentValue - min) / (max - min)) * 100

  const sizes = {
    small: {
      track: 'h-1.5',
      thumb: 'w-3.5 h-3.5',
      label: 'text-[12px]',
      value: 'text-[11px] w-8',
      helper: 'text-[11px]',
    },
    medium: {
      track: 'h-2',
      thumb: 'w-4 h-4',
      label: 'text-[13px]',
      value: 'text-[13px] w-10',
      helper: 'text-[12px]',
    },
    large: {
      track: 'h-2.5',
      thumb: 'w-5 h-5',
      label: 'text-[14px]',
      value: 'text-[14px] w-12',
      helper: 'text-[13px]',
    },
  }

  const updateValue = (clientX: number) => {
    if (!trackRef.current || disabled) return

    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const percentage = x / rect.width
    let newValue = min + percentage * (max - min)

    // Snap to step
    newValue = Math.round(newValue / step) * step
    newValue = Math.max(min, Math.min(max, newValue))

    // Round to avoid floating point precision issues
    newValue = Math.round(newValue / step) * step

    if (!isControlled) {
      setInternalValue(newValue)
    }
    onChange?.(newValue)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return
    e.preventDefault()
    setIsDragging(true)
    updateValue(e.clientX)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    setIsDragging(true)
    updateValue(e.touches[0].clientX)
  }

  const handleMouseEnter = () => {
    if (!disabled) setIsHovering(true)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      updateValue(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      updateValue(e.touches[0].clientX)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleMouseUp)
    }
  }, [isDragging])

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <label
          className={cn(
            'mb-2 block font-medium',
            sizes[size].label,
            isDark ? 'text-white' : 'text-[#1d1d1f]',
            disabled && 'opacity-50',
          )}>
          {label}
        </label>
      )}

      {/* Slider Container */}
      <div className='flex items-center gap-4'>
        {/* Track Container */}
        <div
          ref={trackRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            'relative flex flex-1 items-center py-2',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}>
          {/* Track */}
          <div
            className={cn(
              'relative w-full rounded-full transition-all duration-200',
              sizes[size].track,
              isDark ? 'bg-white/20' : 'bg-black/10',
              disabled && 'opacity-50',
              (isHovering || isDragging) && !disabled && 'bg-opacity-80',
            )}>
            {/* Active track (filled portion) */}
            <m.div
              className={cn(
                'absolute left-0 top-0 h-full rounded-full',
                'bg-gradient-to-r from-[#0098FC] to-[#00D4FF]',
              )}
              initial={false}
              style={{ width: isDragging ? `${percentage}%` : undefined }}
              animate={!isDragging ? { width: `${percentage}%` } : undefined}
              transition={
                !isDragging
                  ? {
                      type: 'spring',
                      stiffness: 400,
                      damping: 35,
                      mass: 0.5,
                    }
                  : undefined
              }
            />
          </div>

          {/* Thumb */}
          <m.div
            className={cn(
              'pointer-events-none absolute -translate-x-1/2 rounded-full bg-white',
              sizes[size].thumb,
            )}
            style={{
              left: isDragging ? `${percentage}%` : undefined,
              boxShadow: isDragging
                ? '0 0 0 8px rgba(0, 152, 252, 0.12), 0 4px 12px rgba(0, 0, 0, 0.15)'
                : isHovering
                  ? '0 0 0 6px rgba(0, 152, 252, 0.08), 0 2px 8px rgba(0, 0, 0, 0.12)'
                  : '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
            }}
            initial={false}
            animate={
              !isDragging
                ? {
                    left: `${percentage}%`,
                    scale: isDragging ? 1.1 : isHovering ? 1.05 : 1,
                  }
                : {
                    scale: isDragging ? 1.1 : isHovering ? 1.05 : 1,
                  }
            }
            transition={{
              left: {
                type: 'spring',
                stiffness: 400,
                damping: 35,
                mass: 0.5,
              },
              scale: {
                type: 'spring',
                stiffness: 500,
                damping: 30,
                mass: 0.5,
              },
              boxShadow: {
                duration: 0.15,
              },
            }}
          />
        </div>

        {/* Value Display */}
        {showValue && (
          <m.span
            className={cn(
              'font-mono font-medium tabular-nums transition-colors duration-150',
              sizes[size].value,
              isDark
                ? isDragging
                  ? 'text-white/90'
                  : 'text-white/60'
                : isDragging
                  ? 'text-black/90'
                  : 'text-black/60',
              disabled && 'opacity-50',
            )}
            animate={{
              scale: isDragging ? 1.05 : 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
              mass: 0.5,
            }}>
            {valueFormatter(currentValue)}
          </m.span>
        )}
      </div>

      {/* Helper Text */}
      {helperText && (
        <p
          className={cn(
            'mt-1.5',
            sizes[size].helper,
            isDark ? 'text-white/50' : 'text-black/50',
            disabled && 'opacity-50',
          )}>
          {helperText}
        </p>
      )}
    </div>
  )
}
