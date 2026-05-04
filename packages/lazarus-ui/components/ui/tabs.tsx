'use client'

import { AnimatePresence, m } from 'motion/react'
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  disabled?: boolean
}

interface TabsProps {
  tabs: Tab[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  variant?: 'pill' | 'underline'
  size?: 'small' | 'medium' | 'large'
  fontSize?: 14 | 17
  isDark?: boolean
  className?: string
  tabClassName?: string
  indicatorClassName?: string
  keyboard?: boolean
  children?: ReactNode
}

interface TabPanelProps {
  value: string
  children: ReactNode
  className?: string
  forceMount?: boolean
}

interface TabsContextValue {
  activeTab: string
  setActiveTab: (tab: string) => void
  variant: TabsProps['variant']
  size: TabsProps['size']
  isDark: boolean
}

const TabsContext = createContext<TabsContextValue | null>(null)

const useTabsContext = () => {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('TabPanel must be used within Tabs component')
  }
  return context
}

export function Tabs({
  tabs,
  value: controlledValue,
  defaultValue,
  onChange,
  variant = 'pill',
  size = 'medium',
  fontSize = 14,
  isDark = false,
  className = '',
  tabClassName = '',
  indicatorClassName = '',
  keyboard = true,
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(
    defaultValue || tabs[0]?.id || '',
  )
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({})
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  const isControlled = controlledValue !== undefined
  const activeTab = isControlled ? controlledValue : internalValue
  const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab)

  const updateIndicator = useRef(() => {})

  // Keep the ref callback current with latest activeTab/variant
  useEffect(() => {
    updateIndicator.current = () => {
      const activeButton = tabRefs.current.get(activeTab)
      const container = containerRef.current

      if (
        activeButton &&
        container &&
        (variant === 'pill' || variant === 'underline')
      ) {
        const containerRect = container.getBoundingClientRect()
        const buttonRect = activeButton.getBoundingClientRect()

        if (containerRect.width === 0) return

        setIndicatorStyle({
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
          ...(variant === 'underline' && { bottom: 0 }),
        })
      }
    }
  }, [activeTab, variant])

  // Update indicator position on tab change
  useEffect(() => {
    const rafId = requestAnimationFrame(() => updateIndicator.current())
    return () => cancelAnimationFrame(rafId)
  }, [activeTab, variant, tabs])

  // Recalculate indicator when container becomes visible or resizes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      updateIndicator.current()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const handleTabChange = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (tab?.disabled) return

    if (!isControlled) {
      setInternalValue(tabId)
    }
    onChange?.(tabId)

    // Haptic feedback on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (!keyboard) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTab)
      let newIndex = currentIndex

      if (e.key === 'ArrowLeft') {
        newIndex = currentIndex - 1
      } else if (e.key === 'ArrowRight') {
        newIndex = currentIndex + 1
      }

      // Wrap around
      if (newIndex < 0) newIndex = tabs.length - 1
      if (newIndex >= tabs.length) newIndex = 0

      // Skip disabled tabs
      while (tabs[newIndex]?.disabled && newIndex !== currentIndex) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          newIndex--
          if (newIndex < 0) newIndex = tabs.length - 1
        } else {
          newIndex++
          if (newIndex >= tabs.length) newIndex = 0
        }
      }

      if (newIndex !== currentIndex && tabs[newIndex]) {
        e.preventDefault()
        handleTabChange(tabs[newIndex].id)
        tabRefs.current.get(tabs[newIndex].id)?.focus()
      }
    }

    const container = containerRef.current
    container?.addEventListener('keydown', handleKeyDown)
    return () => container?.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, tabs, keyboard])

  const sizes = {
    small: {
      tab: 'text-sm',
      icon: 'w-4 h-4',
      indicator: variant === 'underline' ? { height: 2 } : { inset: 4 },
    },
    medium: {
      tab: 'text-base',
      icon: 'w-5 h-5',
      indicator: variant === 'underline' ? { height: 2 } : { inset: 6 },
    },
    large: {
      tab: 'text-lg',
      icon: 'w-6 h-6',
      indicator: variant === 'underline' ? { height: 4 } : { inset: 8 },
    },
  }

  const variantStyles = {
    pill: {
      container: cn(
        'relative inline-flex items-center justify-center overflow-x-auto rounded-full p-0.5 scrollbar-hide',
        isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]',
      ),
      tab: '',
      activeTab: '',
      indicator: cn(
        'absolute inset-y-0 rounded-full',
        isDark ? 'bg-white/[0.12]' : 'bg-white shadow-sm',
      ),
      indicatorStyle: undefined as React.CSSProperties | undefined,
    },
    underline: {
      container: cn('border-b', isDark ? 'border-white/10' : 'border-black/10'),
      tab: cn(
        'pb-3 font-semibold transition-all duration-200',
        'hover:text-[#0098FC]/70',
      ),
      activeTab: 'text-[#0098FC]',
      indicator: cn(
        'absolute bottom-0 bg-[#0098FC] transition-all duration-300',
        indicatorClassName,
      ),
      indicatorStyle: undefined as React.CSSProperties | undefined,
    },
  }

  const currentVariant = variantStyles[variant]

  return (
    <TabsContext.Provider
      value={{
        activeTab,
        setActiveTab: handleTabChange,
        variant,
        size,
        isDark,
      }}>
      <div>
        <div className='flex justify-center'>
          <div className={cn(currentVariant.container, className)}>
            <div
              ref={containerRef}
              role='tablist'
              aria-orientation='horizontal'
              className='relative z-10 flex'>
              {/* Animated background pill for pill variant */}
              {variant === 'pill' && indicatorStyle.width && (
                <m.div
                  className={currentVariant.indicator}
                  initial={false}
                  animate={{
                    left: indicatorStyle.left,
                    width: indicatorStyle.width,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 35,
                  }}
                />
              )}

              {/* Animated indicator for underline variant */}
              {variant === 'underline' && (
                <div
                  className={variantStyles.underline.indicator}
                  style={{
                    position: 'absolute',
                    height: sizes[size].indicator.height,
                    ...indicatorStyle,
                  }}
                />
              )}

              {/* Tab buttons */}
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id

                return (
                  <div
                    key={tab.id}
                    className='relative flex items-center justify-center'>
                    <m.button
                      ref={(el) => {
                        if (el) tabRefs.current.set(tab.id, el)
                        else tabRefs.current.delete(tab.id)
                      }}
                      role='tab'
                      aria-selected={isActive}
                      aria-controls={`panel-${tab.id}`}
                      aria-disabled={tab.disabled ? true : undefined}
                      tabIndex={isActive ? 0 : -1}
                      disabled={tab.disabled}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        'min-w-[72px] rounded-full px-3 py-1.5',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0098FC] focus-visible:ring-offset-2',
                        tab.disabled && 'cursor-not-allowed opacity-50',
                      )}>
                      <m.div
                        whileTap={{ scale: 0.95 }}
                        transition={{
                          type: 'spring',
                          stiffness: 600,
                          damping: 35,
                          mass: 0.6,
                        }}
                        className='flex items-center justify-center'>
                        <span
                          className={cn(
                            'flex items-center justify-center whitespace-nowrap transition-colors duration-200',
                            'font-medium',
                            isActive
                              ? 'text-[#0098FC]'
                              : isDark
                                ? 'text-white/40 hover:text-white/60'
                                : 'text-black/40 hover:text-black/60',
                          )}
                          style={{ fontSize: `${fontSize}px` }}>
                          {tab.label}
                        </span>
                      </m.div>
                    </m.button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabPanel({
  value,
  children,
  className = '',
  forceMount = false,
}: TabPanelProps) {
  const { activeTab } = useTabsContext()
  const isActive = activeTab === value

  if (!forceMount && !isActive) {
    return null
  }

  return (
    <AnimatePresence mode='wait'>
      {(forceMount || isActive) && (
        <m.div
          key={value}
          role='tabpanel'
          id={`panel-${value}`}
          aria-labelledby={`tab-${value}`}
          initial={{
            opacity: 0,
            y: 10,
            scale: 0.98,
          }}
          animate={{
            opacity: isActive ? 1 : 0,
            y: 0,
            x: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: -10,
            scale: 0.98,
          }}
          transition={{
            type: 'spring',
            stiffness: 700,
            damping: 25,
            mass: 0.3,
          }}
          className={cn(
            !isActive && forceMount && 'pointer-events-none',
            className,
          )}>
          {children}
        </m.div>
      )}
    </AnimatePresence>
  )
}

// Simple wrapper components for compatibility with shadcn/ui-style API
interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={cn('inline-flex items-center justify-center', className)}>
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}

export function TabsTrigger({
  children,
  className = '',
  onClick,
  disabled = false,
}: TabsTriggerProps) {
  return (
    <button
      type='button'
      role='tab'
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5',
        'text-sm font-medium ring-offset-background transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className,
      )}>
      {children}
    </button>
  )
}
