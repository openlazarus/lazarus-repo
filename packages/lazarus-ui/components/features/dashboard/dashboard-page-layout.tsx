'use client'

import {
  RiAddCircleLine,
  RiEqualizer2Line,
  RiRefreshLine,
  RiSearchLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { ReactNode } from 'react'

import { Typography } from '@/components/ui'
import { Tabs } from '@/components/ui/tabs'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  count?: number
}

interface HeaderTab {
  id: string
  label: string
}

interface DashboardPageLayoutProps {
  title?: string
  children: ReactNode
  onSearch?: () => void
  onFilter?: () => void
  onAdd?: () => void
  onSync?: () => void
  showSearch?: boolean
  showFilter?: boolean
  showAdd?: boolean
  showSync?: boolean
  syncing?: boolean
  tabs?: Tab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  headerTabs?: HeaderTab[]
  activeHeaderTab?: string
  onHeaderTabChange?: (tabId: string) => void
  headerActions?: ReactNode
  filterDropdown?: ReactNode
  hideHeader?: boolean
}

export function DashboardPageLayout({
  title,
  children,
  onSearch,
  onFilter,
  onAdd,
  onSync,
  showSearch = true,
  showFilter = true,
  showAdd = false,
  showSync = false,
  syncing = false,
  tabs,
  activeTab,
  onTabChange,
  headerTabs,
  activeHeaderTab,
  onHeaderTabChange,
  headerActions,
  filterDropdown,
  hideHeader = false,
}: DashboardPageLayoutProps) {
  const { isDark } = useTheme()

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <m.div
        className='flex flex-1 flex-col overflow-hidden'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        {/* Fixed Header */}
        {!hideHeader && (
          <div className='flex-shrink-0'>
            <div className='px-6 pb-3 pt-4'>
              <div className='flex items-center justify-between gap-4'>
                <Typography variant='h2Dashboard' className='flex-shrink-0'>
                  {title}
                </Typography>

                {/* Header Tabs (centered) */}
                {headerTabs && headerTabs.length > 0 && activeHeaderTab && (
                  <div className='flex flex-1 items-center justify-center'>
                    <Tabs
                      tabs={headerTabs}
                      value={activeHeaderTab}
                      onChange={onHeaderTabChange}
                      variant='pill'
                      size='medium'
                      fontSize={14}
                      isDark={isDark}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className='flex flex-shrink-0 items-center gap-2'>
                  {headerActions}

                  {showSync && (
                    <button
                      onClick={onSync}
                      disabled={syncing}
                      className={cn(
                        'rounded-full p-2 transition-all',
                        syncing && 'cursor-not-allowed opacity-50',
                        'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
                      )}>
                      <RiRefreshLine
                        size={20}
                        className={cn(
                          'transition-transform duration-500',
                          syncing && 'animate-spin',
                        )}
                      />
                    </button>
                  )}

                  {showSearch && (
                    <button
                      onClick={onSearch}
                      className={cn(
                        'rounded-full p-2 transition-all',
                        'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
                      )}>
                      <RiSearchLine size={20} />
                    </button>
                  )}

                  {showFilter && (
                    <div className='relative'>
                      <button
                        onClick={onFilter}
                        className={cn(
                          'rounded-full p-2 transition-all',
                          'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
                        )}>
                        <RiEqualizer2Line size={20} />
                      </button>
                      {filterDropdown}
                    </div>
                  )}

                  {showAdd && (
                    <button
                      onClick={onAdd}
                      className={cn(
                        'rounded-full p-2 text-[#0098FC] transition-all hover:bg-[#0098FC]/10',
                      )}>
                      <RiAddCircleLine size={20} />
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              {tabs && tabs.length > 0 && (
                <div className='mt-4 flex items-center gap-1'>
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange?.(tab.id)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                        activeTab === tab.id
                          ? 'bg-[hsl(var(--input))] text-[hsl(var(--text-primary))]'
                          : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
                      )}>
                      {tab.label}
                      {tab.count !== undefined && (
                        <span
                          className={cn(
                            'ml-2 text-xs',
                            activeTab === tab.id
                              ? ''
                              : 'text-[hsl(var(--text-tertiary))]',
                          )}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className='border-b border-[hsl(var(--border))]' />
          </div>
        )}

        {/* Scrollable Content */}
        <div className='flex-1 overflow-y-auto overflow-x-hidden'>
          {children}
        </div>
      </m.div>
    </div>
  )
}
