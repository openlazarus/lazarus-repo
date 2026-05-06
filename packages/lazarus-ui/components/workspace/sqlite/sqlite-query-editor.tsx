'use client'

import { RiArrowRightSLine, RiTable2 } from '@remixicon/react'
import React, { useEffect, useRef, useState } from 'react'

import { fileService } from '@/app/(main)/activity/services/file.service'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useSQLiteQuery } from '@/hooks/features/sqlite/use-sqlite-query'
import { cn } from '@/lib/utils'
import { useIdentity } from '@/state/identity'

// Smart cell content thresholds
const CELL_CHAR_THRESHOLD = 50 // Characters before truncation
const CELL_MAX_WIDTH = 320 // Max width in pixels for content cells
const ID_MAX_WIDTH = 120 // Narrower for ID columns

// Detect if a column is likely an ID field
function isIdColumn(columnName: string): boolean {
  const name = columnName.toLowerCase()
  return (
    name === 'id' ||
    name.endsWith('_id') ||
    name.endsWith('id') ||
    name === 'uuid' ||
    name === 'key'
  )
}

// Detect content type for smart formatting
function getContentType(
  value: any,
): 'null' | 'json' | 'long-text' | 'short-text' | 'number' {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'object') return 'json'
  if (typeof value === 'number') return 'number'
  const str = String(value)
  return str.length > CELL_CHAR_THRESHOLD ? 'long-text' : 'short-text'
}

// Smart cell component with truncation and expand on hover
function SmartCell({ value, columnName }: { value: any; columnName?: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const cellRef = useRef<HTMLDivElement>(null)
  const contentType = getContentType(value)
  const isId = columnName ? isIdColumn(columnName) : false
  const maxWidth = isId ? ID_MAX_WIDTH : CELL_MAX_WIDTH

  // Format value for display
  const formatValue = () => {
    if (contentType === 'null') {
      return <span className='italic text-[#8e8e93]'>NULL</span>
    }
    if (contentType === 'json') {
      const jsonStr = JSON.stringify(value)
      return (
        <code className='rounded bg-[rgba(142,142,147,0.12)] px-1 py-0.5 font-mono text-[11px] dark:bg-[rgba(142,142,147,0.24)]'>
          {jsonStr}
        </code>
      )
    }
    return String(value)
  }

  const displayValue = formatValue()
  const stringValue = value === null ? 'NULL' : String(value)
  const needsTruncation = stringValue.length > CELL_CHAR_THRESHOLD

  if (!needsTruncation) {
    return (
      <div
        className='whitespace-nowrap text-[#1d1d1f] dark:text-[#f5f5f7]'
        style={{ maxWidth }}>
        {displayValue}
      </div>
    )
  }

  return (
    <div
      ref={cellRef}
      className='group relative'
      style={{ maxWidth }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}>
      {/* Truncated display */}
      <div className='truncate whitespace-nowrap text-[#1d1d1f] dark:text-[#f5f5f7]'>
        {displayValue}
      </div>

      {/* Expanded tooltip on hover */}
      {isExpanded && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-1',
            'max-h-[200px] max-w-[400px] overflow-auto',
            'rounded-lg border border-[#e5e5e7] bg-white p-3 shadow-lg',
            'dark:border-[#38383a] dark:bg-[#2c2c2e]',
            'text-[12px] leading-relaxed',
            'whitespace-pre-wrap break-words',
          )}>
          {contentType === 'json' ? (
            <pre className='font-mono text-[11px] text-[#1d1d1f] dark:text-[#f5f5f7]'>
              {JSON.stringify(value, null, 2)}
            </pre>
          ) : (
            <span className='text-[#1d1d1f] dark:text-[#f5f5f7]'>
              {stringValue}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface SQLiteQueryEditorProps {
  workspaceId: string
  databasePath: string
  databaseName: string
}

interface DBSchema {
  type?: string
  version?: string
  name?: string
  description?: string
  tables?: Array<{
    name: string
    columns: Array<{
      name: string
      type: string
      nullable?: boolean
      primaryKey?: boolean
      autoIncrement?: boolean
      unique?: boolean
      default?: any
    }>
    foreignKeys?: Array<{
      column: string
      references: { table: string; column: string }
    }>
    indexes?: Array<{
      name: string
      columns: string[]
    }>
    rowCount?: number
  }>
}

export function SQLiteQueryEditor({
  workspaceId,
  databasePath,
  databaseName,
}: SQLiteQueryEditorProps) {
  const [query, setQuery] = useState('SELECT * FROM ')
  const [schema, setSchema] = useState<DBSchema | null>(null)
  const [loadingSchema, setLoadingSchema] = useState(true)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const { profile } = useIdentity()
  const { executeQuery, loading, error, result } = useSQLiteQuery(workspaceId)

  // Load schema from the .db.json file
  useEffect(() => {
    async function loadSchema() {
      if (!workspaceId) return

      try {
        setLoadingSchema(true)
        setSchemaError(null)

        const response = await fileService.readFile(
          'user', // scope is ignored
          workspaceId,
          databasePath,
          '', // userId no longer used
        )

        const schemaData = JSON.parse(response.content) as DBSchema
        setSchema(schemaData)
      } catch (err: any) {
        setSchemaError(err?.message || 'Failed to load database schema')
      } finally {
        setLoadingSchema(false)
      }
    }

    loadSchema()
  }, [databasePath, workspaceId])

  const handleExecute = async () => {
    try {
      await executeQuery(databasePath, query)
    } catch (err) {
      // Error is handled by the hook
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Execute on Cmd+Enter or Ctrl+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleExecute()
    }
  }

  if (loadingSchema) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-center'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
          <p className='mt-4 text-sm text-muted-foreground'>
            Loading database schema...
          </p>
        </div>
      </div>
    )
  }

  if (schemaError || !schema) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-center'>
          <p className='text-red-600 dark:text-red-400'>
            {schemaError || 'Failed to load schema'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]'>
      {/* Sidebar - Schema Browser */}
      <div className='flex w-80 flex-col border-r border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-[#1c1c1e]'>
        {/* Database Header */}
        <div className='border-b border-black/[0.06] bg-gradient-to-br from-[#f5f5f7] to-white p-6 dark:border-white/[0.08] dark:from-[#2c2c2e] dark:to-[#1c1c1e]'>
          <div className='mb-3 flex items-center gap-3'>
            <div className='rounded-lg bg-blue-500/10 p-2.5 dark:bg-blue-400/10'>
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
            <div className='min-w-0 flex-1'>
              <h1 className='truncate text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]'>
                {schema.name || databaseName}
              </h1>
              {schema.description && (
                <p className='truncate text-xs text-[#424245] dark:text-[#a1a1a6]'>
                  {schema.description}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className='flex gap-4 rounded-lg bg-white/50 p-3 text-xs dark:bg-[#1c1c1e]/50'>
            {schema.tables && (
              <div className='flex items-center gap-1.5'>
                <div className='h-1.5 w-1.5 rounded-full bg-blue-500' />
                <span className='font-medium text-[#1d1d1f] dark:text-[#f5f5f7]'>
                  {schema.tables.length}
                </span>
                <span className='text-[#8e8e93]'>
                  {schema.tables.length === 1 ? 'table' : 'tables'}
                </span>
              </div>
            )}
            {schema.version && (
              <>
                <div className='h-4 w-px bg-black/[0.06] dark:bg-white/[0.08]' />
                <div className='flex items-center gap-1.5'>
                  <span className='text-[#8e8e93]'>v{schema.version}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Schema Tables */}
        <div className='flex-1 overflow-y-auto p-3'>
          {schema.tables && schema.tables.length > 0 ? (
            <div className='space-y-2'>
              <div className='mb-2 px-2'>
                <h3 className='text-xs font-semibold uppercase tracking-wide text-[#8e8e93]'>
                  Tables
                </h3>
              </div>
              {schema.tables.map((table) => (
                <Collapsible key={table.name}>
                  <CollapsibleTrigger asChild>
                    <button className='group flex w-full items-center justify-between rounded-lg p-2.5 text-left transition-all hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e]'>
                      <div className='flex min-w-0 flex-1 items-center gap-2'>
                        <RiTable2 className='h-4 w-4 shrink-0 text-[#8e8e93]' />
                        <div className='min-w-0 flex-1'>
                          <div className='truncate text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]'>
                            {table.name}
                          </div>
                          <div className='text-xs text-[#8e8e93]'>
                            {table.columns.length} columns
                            {table.rowCount !== undefined &&
                              ` · ${table.rowCount.toLocaleString()} rows`}
                          </div>
                        </div>
                      </div>
                      <RiArrowRightSLine className='h-3.5 w-3.5 text-[#8e8e93] transition-transform group-data-[state=open]:rotate-90' />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className='ml-2 mt-1 space-y-1 border-l border-black/[0.06] pl-3 dark:border-white/[0.08]'>
                      {table.columns.map((column) => (
                        <div
                          key={column.name}
                          className='flex items-center gap-2 py-1 text-xs'>
                          <code className='rounded bg-[#f5f5f7] px-1.5 py-0.5 font-mono text-[#1d1d1f] dark:bg-[#2c2c2e] dark:text-[#f5f5f7]'>
                            {column.name}
                          </code>
                          <span className='text-[#8e8e93]'>{column.type}</span>
                          {column.primaryKey && (
                            <span className='rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'>
                              PK
                            </span>
                          )}
                          {column.unique && (
                            <span className='rounded bg-purple-100 px-1.5 py-0.5 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'>
                              U
                            </span>
                          )}
                          {!column.nullable && (
                            <span className='rounded bg-orange-100 px-1.5 py-0.5 font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'>
                              NN
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className='flex h-32 items-center justify-center'>
              <p className='text-sm text-[#8e8e93]'>No tables in schema</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Query Editor */}
      <div className='flex flex-1 flex-col overflow-hidden'>
        {/* Query Editor Header */}
        <div className='border-b border-black/[0.06] bg-white px-6 py-4 dark:border-white/[0.08] dark:bg-[#1c1c1e]'>
          <h2 className='text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]'>
            Query Editor
          </h2>
          <p className='text-sm text-[#8e8e93]'>
            Write and execute SQL queries · Press{' '}
            <kbd className='rounded bg-[#f5f5f7] px-1.5 py-0.5 font-mono text-xs dark:bg-[#2c2c2e]'>
              ⌘↵
            </kbd>{' '}
            to run
          </p>
        </div>

        {/* Query Editor Content */}
        <div className='flex flex-1 flex-col overflow-hidden p-6'>
          <div className='flex flex-col space-y-4'>
            {/* SQL Editor */}
            <div className='overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#1c1c1e]'>
              <div className='border-b border-black/[0.06] bg-[#f5f5f7] px-4 py-2 dark:border-white/[0.08] dark:bg-[#2c2c2e]'>
                <div className='flex items-center gap-2'>
                  <svg
                    className='h-4 w-4 text-[#8e8e93]'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth={2}
                    viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
                    />
                  </svg>
                  <span className='text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]'>
                    SQL
                  </span>
                </div>
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='SELECT * FROM table_name WHERE ...'
                rows={8}
                className='w-full resize-none bg-white px-4 py-3 font-mono text-sm text-[#1d1d1f] placeholder:text-[#8e8e93] focus:outline-none dark:bg-[#1c1c1e] dark:text-[#f5f5f7]'
              />
              <div className='flex items-center justify-between border-t border-black/[0.06] px-4 py-3 dark:border-white/[0.08]'>
                <div className='text-xs text-[#8e8e93]'>
                  Read-only queries (SELECT statements only)
                </div>
                <Button
                  onClick={handleExecute}
                  disabled={loading || !query.trim()}
                  size='small'
                  className='gap-2'>
                  {loading ? (
                    <>
                      <div className='h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent' />
                      Executing
                    </>
                  ) : (
                    <>
                      <svg
                        className='h-3.5 w-3.5'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth={2}
                        viewBox='0 0 24 24'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          d='M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z'
                        />
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                      Run Query
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className='rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20'>
                <div className='flex gap-3'>
                  <svg
                    className='h-5 w-5 shrink-0 text-red-600 dark:text-red-400'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth={2}
                    viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                  <div className='flex-1'>
                    <p className='text-sm font-medium text-red-600 dark:text-red-400'>
                      Query Error
                    </p>
                    <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className='flex-1 overflow-auto'>
                <div className='mb-3 flex items-center justify-between'>
                  <div>
                    <h3 className='text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]'>
                      Results
                    </h3>
                    <p className='text-xs text-[#8e8e93]'>
                      {result.count} {result.count === 1 ? 'row' : 'rows'}{' '}
                      returned
                    </p>
                  </div>
                </div>

                {result.results.length > 0 ? (
                  <div className='overflow-x-auto rounded-lg border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-[#1c1c1e]'>
                    <table className='w-full border-collapse text-sm'>
                      <thead className='sticky top-0 z-10'>
                        <tr>
                          {Object.keys(result.results[0]).map(
                            (key, colIndex, arr) => (
                              <th
                                key={key}
                                className={cn(
                                  'whitespace-nowrap border-b border-black/[0.06] bg-[#f5f5f7] px-3 py-1.5 text-left text-[12px] font-medium text-[#424245] transition-colors dark:border-white/[0.06] dark:bg-[#2c2c2e] dark:text-[#a1a1a6]',
                                  colIndex < arr.length - 1 &&
                                    'border-r border-r-black/[0.04] dark:border-r-white/[0.04]',
                                )}>
                                {key}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {result.results.map((row, index) => {
                          const keys = Object.keys(row)
                          return (
                            <tr
                              key={index}
                              className={`border-b border-black/[0.04] transition-colors last:border-0 hover:bg-[rgba(0,122,255,0.04)] dark:border-white/[0.04] dark:hover:bg-[rgba(10,132,255,0.06)] ${
                                index % 2 === 1
                                  ? 'bg-[#fafafa]/40 dark:bg-[#1a1a1c]/40'
                                  : 'bg-white dark:bg-[#1c1c1e]'
                              }`}>
                              {keys.map((key, colIndex) => (
                                <td
                                  key={key}
                                  className={cn(
                                    'px-3 py-1.5 align-middle text-[13px]',
                                    colIndex < keys.length - 1 &&
                                      'border-r border-r-black/[0.04] dark:border-r-white/[0.04]',
                                  )}>
                                  <SmartCell
                                    value={row[key]}
                                    columnName={key}
                                  />
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className='rounded-lg border border-black/[0.06] bg-white p-6 text-center dark:border-white/[0.08] dark:bg-[#1c1c1e]'>
                    <p className='text-sm text-[#8e8e93]'>
                      No results returned
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
