'use client'

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { RiCloseLine } from '@remixicon/react'
import React, { useState } from 'react'

import { cn } from '@/lib/utils'

// Types
export interface Tab {
  id: string
  title: string
  icon?: string | React.ReactNode
  isDirty?: boolean
  closable?: boolean
  metadata?: any
  // Agent-specific properties for chat tabs
  agentId?: string | null
  agentName?: string
}

// Agent color palette - aligned with Lazarus design system
// Uses HSL values that harmonize with --lazarus-blue (204 98% 49%)
// and work well in both light and dark modes
const AGENT_COLORS: Array<{ hue: number; sat: number; light: number }> = [
  { hue: 204, sat: 98, light: 49 }, // Lazarus blue - primary
  { hue: 193, sat: 100, light: 45 }, // Lazarus cyan - secondary
  { hue: 280, sat: 65, light: 55 }, // Purple - complementary
  { hue: 340, sat: 75, light: 55 }, // Rose - warm accent
  { hue: 160, sat: 70, light: 42 }, // Teal - cool accent
  { hue: 45, sat: 85, light: 50 }, // Amber - warm neutral
  { hue: 220, sat: 70, light: 55 }, // Indigo - deep blue variant
  { hue: 140, sat: 60, light: 45 }, // Green - success tone
]

const getAgentColor = (agentName: string, isDark?: boolean): string => {
  // Simple hash function to get consistent color per agent name
  let hash = 0
  for (let i = 0; i < agentName.length; i++) {
    const char = agentName.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % AGENT_COLORS.length
  const { hue, sat, light } = AGENT_COLORS[index]
  // Adjust lightness for dark mode readability
  const adjustedLight = isDark ? Math.min(light + 10, 65) : light
  return `hsl(${hue}, ${sat}%, ${adjustedLight}%)`
}

// Get background color with appropriate opacity for agent badge
const getAgentBgColor = (agentName: string, isDark?: boolean): string => {
  let hash = 0
  for (let i = 0; i < agentName.length; i++) {
    const char = agentName.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  const index = Math.abs(hash) % AGENT_COLORS.length
  const { hue, sat } = AGENT_COLORS[index]
  // Use lower opacity for subtle background
  const opacity = isDark ? 0.15 : 0.12
  return `hsla(${hue}, ${sat}%, 50%, ${opacity})`
}

interface DraggableTabsProps {
  tabs: Tab[]
  activeTabId?: string
  onTabChange?: (tabId: string) => void
  onTabClose?: (tabId: string) => void
  onTabsReorder?: (tabs: Tab[]) => void
  className?: string
  fontSize?: number
  isDark?: boolean
}

// Render tab icon helper - simplified to only handle React components
const renderTabIcon = (icon?: string | React.ReactNode, isActive?: boolean) => {
  if (!icon) return null

  // Handle React components (from getFileTypeIconComponent)
  if (React.isValidElement(icon)) {
    return React.cloneElement(icon as React.ReactElement, {
      className: cn(
        'h-3.5 w-3.5 transition-opacity duration-150',
        isActive ? 'opacity-100' : 'opacity-60',
        (icon as React.ReactElement).props?.className,
      ),
    })
  }

  // Fallback for any string that shouldn't be there
  console.warn('Tab icon should be a React component, got:', icon)
  return null
}

// Sortable Tab Item
const SortableTab: React.FC<{
  tab: Tab
  isActive: boolean
  onSelect: () => void
  onClose?: () => void
  fontSize: number
  isDark?: boolean
}> = ({ tab, isActive, onSelect, onClose, fontSize, isDark }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tab.id,
    transition: {
      duration: 150,
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    willChange: 'transform, opacity',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex h-8 cursor-grab items-center gap-1.5 px-3 active:cursor-grabbing',
        'rounded-t-md',
        'transition-all duration-150',
        // Active state - filled background and extends to cover border
        isActive
          ? isDark
            ? 'mb-[-1px] h-[33px] bg-[#111112] shadow-sm'
            : 'mb-[-1px] h-[33px] bg-white shadow-sm'
          : isDark
            ? 'hover:bg-white/[0.05]'
            : 'hover:bg-black/[0.04]',
        // Text styling
        isDark
          ? isActive
            ? 'text-white'
            : 'text-white/60 hover:text-white/80'
          : isActive
            ? 'text-[#1d1d1f]'
            : 'text-black/50 hover:text-black/70',
      )}
      {...attributes}
      {...listeners}>
      {/* Blue accent bar at top for active tab */}
      {isActive && (
        <div className='absolute left-0 right-0 top-0 h-[2px] rounded-t-md bg-[#0098FC]' />
      )}

      {/* Content - clickable for selection */}
      <div
        className='flex min-w-0 flex-1 items-center gap-1.5'
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}>
        {renderTabIcon(tab.icon, isActive)}

        {/* Agent badge - only shown for non-default agents */}
        {tab.agentName && tab.agentName !== 'Lazarus' && (
          <div
            className={cn(
              'flex flex-shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5',
              'transition-all duration-150',
            )}
            style={{
              backgroundColor: getAgentBgColor(tab.agentName, isDark),
            }}>
            {/* Colored dot indicator */}
            <div
              className='h-1.5 w-1.5 flex-shrink-0 rounded-full'
              style={{ backgroundColor: getAgentColor(tab.agentName, isDark) }}
            />
            {/* Agent name */}
            <span
              className='max-w-[60px] truncate text-[10px] font-medium leading-none'
              style={{ color: getAgentColor(tab.agentName, isDark) }}>
              {tab.agentName}
            </span>
          </div>
        )}

        <span
          className={cn(
            'truncate tracking-[-0.01em]',
            isActive ? 'font-medium' : 'font-normal',
          )}
          style={{ fontSize: `${fontSize}px` }}>
          {tab.title}
        </span>
      </div>

      {/* Close button / Dirty indicator - VS Code style */}
      {tab.closable !== false && onClose && (
        <div
          className={cn(
            'relative flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-sm',
            'transition-all duration-150',
            isDark ? 'hover:bg-white/[0.15]' : 'hover:bg-black/[0.08]',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}>
          {/* Dirty indicator dot - shown when not hovering */}
          {tab.isDirty && (
            <div
              className={cn(
                'absolute h-[6px] w-[6px] rounded-full transition-opacity duration-150',
                'group-hover:opacity-0',
                isActive ? 'bg-[#0098FC]' : isDark ? 'bg-white' : 'bg-black/60',
              )}
            />
          )}
          {/* Close icon - always shows on hover, or when not dirty */}
          <RiCloseLine
            className={cn(
              'h-3 w-3 transition-opacity duration-150',
              tab.isDirty
                ? 'opacity-0 group-hover:opacity-100'
                : 'opacity-0 group-hover:opacity-100',
            )}
          />
        </div>
      )}
    </div>
  )
}

// Main Component
export const DraggableTabs: React.FC<DraggableTabsProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabsReorder,
  className,
  fontSize = 13,
  isDark = false,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((tab) => tab.id === active.id)
      const newIndex = tabs.findIndex((tab) => tab.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newTabs = arrayMove(tabs, oldIndex, newIndex)
        onTabsReorder?.(newTabs)
      }
    }

    setActiveId(null)
  }

  const activeTab = activeId ? tabs.find((tab) => tab.id === activeId) : null

  return (
    <div className={cn('flex gap-1 overflow-visible', className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}>
        <div className='scrollbar-hide flex flex-1 gap-1 overflow-x-auto'>
          <SortableContext
            items={tabs.map((tab) => tab.id)}
            strategy={horizontalListSortingStrategy}>
            {tabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onSelect={() => onTabChange?.(tab.id)}
                onClose={onTabClose ? () => onTabClose(tab.id) : undefined}
                fontSize={fontSize}
                isDark={isDark}
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay
          dropAnimation={{
            duration: 150,
            easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
          }}>
          {activeTab && (
            <div
              className={cn(
                'flex h-[28px] cursor-grabbing items-center gap-1.5 rounded-t-md px-3 shadow-lg',
                isDark ? 'bg-[#2c2c2e] text-white' : 'bg-white text-[#1d1d1f]',
              )}
              style={{
                willChange: 'transform',
              }}>
              {/* Blue accent */}
              <div className='absolute left-0 right-0 top-0 h-[2px] rounded-t-md bg-[#0098FC]' />

              {renderTabIcon(activeTab.icon, true)}

              {/* Agent badge in drag overlay */}
              {activeTab.agentName && activeTab.agentName !== 'Lazarus' && (
                <div
                  className='flex flex-shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5'
                  style={{
                    backgroundColor: getAgentBgColor(
                      activeTab.agentName,
                      isDark,
                    ),
                  }}>
                  <div
                    className='h-1.5 w-1.5 flex-shrink-0 rounded-full'
                    style={{
                      backgroundColor: getAgentColor(
                        activeTab.agentName,
                        isDark,
                      ),
                    }}
                  />
                  <span
                    className='max-w-[60px] truncate text-[10px] font-medium leading-none'
                    style={{
                      color: getAgentColor(activeTab.agentName, isDark),
                    }}>
                    {activeTab.agentName}
                  </span>
                </div>
              )}

              <span
                className='truncate font-medium tracking-[-0.01em]'
                style={{ fontSize: `${fontSize}px` }}>
                {activeTab.title}
              </span>
              {activeTab.isDirty && (
                <div className='h-[6px] w-[6px] rounded-full bg-[#0098FC]' />
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export type { DraggableTabsProps }
