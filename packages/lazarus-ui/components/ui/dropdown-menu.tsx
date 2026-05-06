'use client'

import * as m from 'motion/react-m'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface DropdownOption {
  value: string
  label: string
  icon?: React.ReactNode
  description?: string
  disabled?: boolean
  divider?: boolean
}

interface DropdownMenuProps {
  options: DropdownOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  variant?: 'surface' | 'ghost' | 'bordered'
  size?: 'small' | 'medium' | 'large'
  isDark?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  animated?: boolean
  className?: string
}

export function DropdownMenu({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = 'Select an option',
  label,
  disabled = false,
  variant = 'surface',
  size = 'medium',
  isDark = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  animated = true,
  className = '',
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue || '')
  const [searchTerm, setSearchTerm] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState<'above' | 'below'>(
    'below',
  )
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isControlled = controlledValue !== undefined
  const selectedValue = isControlled ? controlledValue : internalValue
  const selectedOption = options.find((opt) => opt.value === selectedValue)

  // Filter options based on search term
  const filteredOptions = searchable
    ? options.filter((option) => {
        if (option.divider) return true
        return option.label.toLowerCase().includes(searchTerm.toLowerCase())
      })
    : options

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Focus search input when dropdown opens
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, searchable])

  // Calculate dropdown position based on available space
  useLayoutEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const menuHeight = 240 // Max height of dropdown

      // If not enough space below but more space above, position above
      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('above')
      } else {
        setDropdownPosition('below')
      }
    }
  }, [isOpen])

  const handleSelect = (option: DropdownOption) => {
    if (option.disabled || option.divider) return

    if (!isControlled) {
      setInternalValue(option.value)
    }
    onChange?.(option.value)
    setIsOpen(false)
  }

  const sizes = {
    small: {
      trigger: 'h-7 px-2.5 text-xs',
      dropdown: 'py-0.5',
      option: 'px-3 py-1 gap-2 text-sm',
      chevronSize: 12,
    },
    medium: {
      trigger: 'h-8 px-3 text-sm',
      dropdown: 'py-0.5',
      option: 'px-3 py-1 gap-2 text-sm',
      chevronSize: 14,
    },
    large: {
      trigger: 'h-10 px-4 text-base',
      dropdown: 'py-0.5',
      option: 'px-4 py-1.5 gap-2 text-sm',
      chevronSize: 16,
    },
  }

  // Get background style for surface variant
  const getSurfaceStyle = () => {
    if (variant !== 'surface') return {}
    if (disabled) {
      return { background: 'transparent', opacity: 0.5 }
    }
    return { background: 'hsl(var(--input))' }
  }

  const triggerClasses = {
    surface: cn(
      'border-transparent',
      !disabled &&
        (isDark ? 'hover:bg-white/[0.08]' : 'hover:brightness-[0.98]'),
    ),
    ghost: cn(
      'bg-transparent border-transparent',
      !disabled && (isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.04]'),
    ),
    bordered: cn(
      'bg-transparent border',
      isDark
        ? 'border-white/10 hover:border-white/20'
        : 'border-[hsl(var(--border))] hover:border-[hsl(var(--border-dark))]',
    ),
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {label && (
        <label className='mb-2 block text-sm font-semibold text-[hsl(var(--text-primary))]'>
          {label}
        </label>
      )}

      <m.button
        type='button'
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={getSurfaceStyle()}
        whileHover={!disabled ? { scale: 1.01 } : undefined}
        whileTap={!disabled ? { scale: 0.99 } : undefined}
        className={cn(
          'inline-flex items-center justify-between gap-2 whitespace-nowrap rounded-lg font-medium',
          'border ring-2 ring-transparent focus:outline-none',
          'transition-all duration-200',
          sizes[size].trigger,
          triggerClasses[variant],
          'text-[hsl(var(--text-primary))]',
          isOpen &&
            'border-transparent shadow-[0_0_0_3px_rgba(0,152,252,0.1)] ring-[#0098FC]',
          disabled && 'cursor-not-allowed opacity-50',
        )}>
        <div className='flex min-w-0 flex-1 items-center gap-2'>
          {selectedOption?.icon && (
            <span className='flex-shrink-0'>{selectedOption.icon}</span>
          )}
          <span className='truncate leading-tight'>
            {selectedOption?.label || (
              <span className='text-[hsl(var(--input-placeholder))]'>
                {placeholder}
              </span>
            )}
          </span>
        </div>
        <m.svg
          width={sizes[size].chevronSize}
          height={sizes[size].chevronSize}
          viewBox='0 0 16 16'
          fill='none'
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className='flex-shrink-0 text-[hsl(var(--text-secondary))]'>
          <path
            d='M4 6L8 10L12 6'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </m.svg>
      </m.button>

      {isOpen && (
        <m.div
          ref={menuRef}
          initial={{
            opacity: 0,
            scale: 0.96,
            y: dropdownPosition === 'above' ? 4 : -4,
          }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 28,
            mass: 0.8,
          }}
          className={cn(
            'absolute z-50 w-max min-w-full overflow-hidden rounded-xl',
            'border shadow-xl backdrop-blur-xl',
            isDark
              ? 'border-white/10 bg-[#1d1d1f]'
              : 'border-[hsl(var(--border))] bg-white',
            sizes[size].dropdown,
            dropdownPosition === 'above' ? 'bottom-full mb-1' : 'top-full mt-1',
          )}>
          {/* Search input */}
          {searchable && (
            <div
              className='border-b px-2 py-2'
              style={{
                borderColor: isDark
                  ? 'rgba(255,255,255,0.1)'
                  : 'hsl(var(--border))',
              }}>
              <Input
                ref={searchInputRef}
                type='text'
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant='ghost'
                size='small'
                isDark={isDark}
                iconLeft={
                  <svg width='14' height='14' viewBox='0 0 20 20' fill='none'>
                    <path
                      d='M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                    <path
                      d='M19 19L14.65 14.65'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                }
              />
            </div>
          )}

          <div className='max-h-[240px] overflow-y-auto'>
            {filteredOptions.length === 0 && searchable ? (
              <div className='px-3 py-6 text-center'>
                <p className='text-xs text-[hsl(var(--text-secondary))]'>
                  No results found
                </p>
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                if (option.divider) {
                  return (
                    <div
                      key={`divider-${index}`}
                      className={cn(
                        'mx-2 my-1 border-t',
                        isDark
                          ? 'border-white/10'
                          : 'border-[hsl(var(--border))]',
                      )}
                    />
                  )
                }

                const isSelected = selectedValue === option.value
                const OptionButton = animated ? m.button : 'button'
                const buttonProps = animated
                  ? {
                      initial: { opacity: 0, x: -8 },
                      animate: {
                        opacity: 1,
                        x: 0,
                        transition: {
                          duration: 0.2,
                          delay: index * 0.03,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      },
                      whileHover: !option.disabled
                        ? {
                            x: 2,
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.06)'
                              : 'rgba(0, 0, 0, 0.04)',
                            transition: { duration: 0.15 },
                          }
                        : undefined,
                      whileTap: !option.disabled ? { scale: 0.98 } : undefined,
                    }
                  : {}

                return (
                  <OptionButton
                    key={option.value}
                    type='button'
                    onClick={() => handleSelect(option)}
                    disabled={option.disabled}
                    className={cn(
                      'flex w-full items-center whitespace-nowrap text-left',
                      'transition-colors duration-200',
                      sizes[size].option,
                      'text-[hsl(var(--text-primary))]',
                      option.disabled && 'cursor-not-allowed opacity-40',
                      !option.disabled && 'cursor-pointer',
                      isSelected && 'bg-[#0098FC]/[0.08]',
                      isSelected && 'text-[#0098FC]',
                    )}
                    {...buttonProps}>
                    {option.icon && (
                      <span
                        className={cn(
                          'flex-shrink-0',
                          isSelected
                            ? 'text-[#0098FC]'
                            : 'text-[hsl(var(--input-icon))]',
                        )}>
                        {option.icon}
                      </span>
                    )}
                    <div className='min-w-0 flex-1'>
                      <div className='font-medium leading-tight'>
                        {option.label}
                      </div>
                      {option.description && (
                        <div className='mt-0.5 text-[11px] leading-tight text-[hsl(var(--text-secondary))]'>
                          {option.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <svg
                        width='12'
                        height='12'
                        viewBox='0 0 16 16'
                        fill='none'
                        className='ml-1.5 flex-shrink-0'>
                        <path
                          d='M3 8L6 11L13 4'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    )}
                  </OptionButton>
                )
              })
            )}
          </div>
        </m.div>
      )}
    </div>
  )
}
