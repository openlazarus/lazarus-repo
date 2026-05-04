'use client'

import { SQLiteDatabaseDescriptor } from '@/hooks/features/sqlite/use-sqlite-databases'
import { cn } from '@/lib/utils'

interface SQLiteDatabaseCardProps {
  database: SQLiteDatabaseDescriptor
  onClick?: () => void
}

export function SQLiteDatabaseCard({
  database,
  onClick,
}: SQLiteDatabaseCardProps) {
  const totalRows = database.schema.tables.reduce(
    (sum, table) => sum + table.rowCount,
    0,
  )

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div
      className={cn(
        'group cursor-pointer overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.02)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#1c1c1e] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.06)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)]',
        onClick && 'active:scale-[0.99]',
      )}
      onClick={onClick}>
      {/* Header with gradient background */}
      <div className='border-b border-black/[0.06] bg-gradient-to-br from-[#f5f5f7] to-white p-6 dark:border-white/[0.08] dark:from-[#2c2c2e] dark:to-[#1c1c1e]'>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <h3 className='text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]'>
              {database.name}
            </h3>
            {database.description && (
              <p className='mt-1 text-sm text-[#424245] dark:text-[#a1a1a6]'>
                {database.description}
              </p>
            )}
          </div>
          <div className='rounded-lg bg-blue-500/10 p-2 transition-colors group-hover:bg-blue-500/20 dark:bg-blue-400/10 dark:group-hover:bg-blue-400/20'>
            <svg
              className='h-6 w-6 text-blue-600 dark:text-blue-400'
              fill='none'
              stroke='currentColor'
              strokeWidth={1.5}
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4'
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='space-y-4 p-6'>
        {/* Stats Grid */}
        <div className='grid grid-cols-2 gap-4'>
          {/* Tables */}
          <div className='flex items-start gap-2.5'>
            <div className='rounded-md bg-[#f5f5f7] p-1.5 dark:bg-[#2c2c2e]'>
              <svg
                className='h-4 w-4 text-[#1d1d1f] dark:text-[#f5f5f7]'
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                />
              </svg>
            </div>
            <div className='flex-1'>
              <p className='text-xs font-medium uppercase tracking-wide text-[#424245] dark:text-[#a1a1a6]'>
                Tables
              </p>
              <p className='mt-0.5 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]'>
                {database.schema.tables.length}
              </p>
            </div>
          </div>

          {/* Rows */}
          {database.schema.tables.length > 0 && (
            <div className='flex items-start gap-2.5'>
              <div className='rounded-md bg-[#f5f5f7] p-1.5 dark:bg-[#2c2c2e]'>
                <svg
                  className='h-4 w-4 text-[#1d1d1f] dark:text-[#f5f5f7]'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth={2}
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
                  />
                </svg>
              </div>
              <div className='flex-1'>
                <p className='text-xs font-medium uppercase tracking-wide text-[#424245] dark:text-[#a1a1a6]'>
                  Total Rows
                </p>
                <p className='mt-0.5 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]'>
                  {totalRows.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Size */}
        <div className='flex items-center gap-2 rounded-lg bg-[#f5f5f7]/50 px-3 py-2 dark:bg-[#2c2c2e]/50'>
          <svg
            className='h-4 w-4 text-[#424245] dark:text-[#a1a1a6]'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
            />
          </svg>
          <span className='text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]'>
            {formatSize(database.size)}
          </span>
        </div>

        {/* Table Names Preview */}
        {database.schema.tables.length > 0 && (
          <div className='flex flex-wrap gap-1.5'>
            {database.schema.tables.slice(0, 3).map((table) => (
              <span
                key={table.name}
                className='inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/10 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-400/20'>
                {table.name}
              </span>
            ))}
            {database.schema.tables.length > 3 && (
              <span className='inline-flex items-center rounded-full bg-[#e5e5e7] px-2.5 py-1 text-xs font-medium text-[#424245] ring-1 ring-inset ring-black/5 dark:bg-[#48484a] dark:text-[#a1a1a6] dark:ring-white/10'>
                +{database.schema.tables.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Last Updated */}
        <div className='border-t border-black/[0.06] pt-3 text-xs text-[#8e8e93] dark:border-white/[0.06]'>
          Updated {new Date(database.updatedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}
