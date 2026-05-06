'use client'

import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiDatabase2Line,
  RiPlayLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import Spinner from '@/components/ui/spinner'
import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'
import { useGetSqliteSchema } from '@/hooks/features/sqlite/use-get-sqlite-schema'
import { cn } from '@/lib/utils'

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
      return <span className='text-[#6e6e73] dark:text-[#98989d]'>null</span>
    }
    if (contentType === 'json') {
      const jsonStr = JSON.stringify(value)
      return (
        <code className='rounded bg-[rgba(142,142,147,0.12)] px-1.5 py-0.5 font-mono text-[11px] dark:bg-[rgba(142,142,147,0.24)]'>
          {jsonStr}
        </code>
      )
    }
    return String(value)
  }

  const displayValue = formatValue()
  const stringValue = value === null ? 'null' : String(value)
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

interface SQLiteSchemaViewerProps {
  workspaceId: string
  databasePath: string
  databaseName: string
}

// Xcode-style SQL syntax highlighting colors
const SQL_COLORS = {
  keyword: '#C41A7F', // Pink/magenta for keywords (Xcode style)
  keywordDark: '#FF79C6',
  function: '#3900A0', // Purple for functions
  functionDark: '#BD93F9',
  string: '#C41A16', // Red for strings
  stringDark: '#F1FA8C',
  number: '#1C00CF', // Blue for numbers
  numberDark: '#BD93F9',
  operator: '#000000', // Black for operators
  operatorDark: '#F8F8F2',
  comment: '#007400', // Green for comments
  commentDark: '#6272A4',
  identifier: '#000000', // Black for identifiers
  identifierDark: '#F8F8F2',
}

// SQL keywords for highlighting
const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'IN',
  'LIKE',
  'BETWEEN',
  'IS',
  'NULL',
  'AS',
  'ON',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'CROSS',
  'FULL',
  'GROUP',
  'BY',
  'HAVING',
  'ORDER',
  'ASC',
  'DESC',
  'LIMIT',
  'OFFSET',
  'UNION',
  'ALL',
  'DISTINCT',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'CREATE',
  'TABLE',
  'DROP',
  'ALTER',
  'ADD',
  'COLUMN',
  'INDEX',
  'PRIMARY',
  'KEY',
  'FOREIGN',
  'REFERENCES',
  'CONSTRAINT',
  'DEFAULT',
  'UNIQUE',
  'CHECK',
  'CASCADE',
  'EXISTS',
  'IF',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'CAST',
  'COALESCE',
  'NULLIF',
]

const SQL_FUNCTIONS = [
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'LENGTH',
  'UPPER',
  'LOWER',
  'TRIM',
  'SUBSTR',
  'REPLACE',
  'ROUND',
  'ABS',
  'DATE',
  'TIME',
  'DATETIME',
  'STRFTIME',
  'TYPEOF',
  'IFNULL',
  'IIF',
  'INSTR',
  'PRINTF',
  'RANDOM',
  'GROUP_CONCAT',
  'TOTAL',
  'JSON',
  'JSON_EXTRACT',
  'JSON_ARRAY',
  'JSON_OBJECT',
]

// SQL syntax highlighter component
function SQLHighlighter({ sql, isDark }: { sql: string; isDark: boolean }) {
  const colors = isDark
    ? {
        keyword: SQL_COLORS.keywordDark,
        function: SQL_COLORS.functionDark,
        string: SQL_COLORS.stringDark,
        number: SQL_COLORS.numberDark,
        operator: SQL_COLORS.operatorDark,
        comment: SQL_COLORS.commentDark,
        identifier: SQL_COLORS.identifierDark,
      }
    : {
        keyword: SQL_COLORS.keyword,
        function: SQL_COLORS.function,
        string: SQL_COLORS.string,
        number: SQL_COLORS.number,
        operator: SQL_COLORS.operator,
        comment: SQL_COLORS.comment,
        identifier: SQL_COLORS.identifier,
      }

  const tokenize = useCallback((text: string) => {
    const tokens: Array<{ type: string; value: string }> = []
    let remaining = text

    while (remaining.length > 0) {
      // Comments
      if (remaining.startsWith('--')) {
        const endIdx = remaining.indexOf('\n')
        const comment =
          endIdx === -1 ? remaining : remaining.substring(0, endIdx)
        tokens.push({ type: 'comment', value: comment })
        remaining = remaining.substring(comment.length)
        continue
      }

      // Strings (single quotes)
      if (remaining.startsWith("'")) {
        let endIdx = 1
        while (endIdx < remaining.length) {
          if (remaining[endIdx] === "'" && remaining[endIdx + 1] !== "'") {
            break
          }
          if (remaining[endIdx] === "'" && remaining[endIdx + 1] === "'") {
            endIdx += 2
            continue
          }
          endIdx++
        }
        const str = remaining.substring(0, endIdx + 1)
        tokens.push({ type: 'string', value: str })
        remaining = remaining.substring(str.length)
        continue
      }

      // Numbers
      const numberMatch = remaining.match(/^-?\d+(\.\d+)?/)
      if (
        numberMatch &&
        (tokens.length === 0 ||
          !/\w$/.test(tokens[tokens.length - 1]?.value || ''))
      ) {
        tokens.push({ type: 'number', value: numberMatch[0] })
        remaining = remaining.substring(numberMatch[0].length)
        continue
      }

      // Words (keywords, functions, identifiers)
      const wordMatch = remaining.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)
      if (wordMatch) {
        const word = wordMatch[0]
        const upperWord = word.toUpperCase()
        if (SQL_KEYWORDS.includes(upperWord)) {
          tokens.push({ type: 'keyword', value: word })
        } else if (SQL_FUNCTIONS.includes(upperWord)) {
          tokens.push({ type: 'function', value: word })
        } else {
          tokens.push({ type: 'identifier', value: word })
        }
        remaining = remaining.substring(word.length)
        continue
      }

      // Operators and punctuation
      const opMatch = remaining.match(/^[<>=!]+|^[(),;.*]/)
      if (opMatch) {
        tokens.push({ type: 'operator', value: opMatch[0] })
        remaining = remaining.substring(opMatch[0].length)
        continue
      }

      // Whitespace
      const wsMatch = remaining.match(/^\s+/)
      if (wsMatch) {
        tokens.push({ type: 'whitespace', value: wsMatch[0] })
        remaining = remaining.substring(wsMatch[0].length)
        continue
      }

      // Unknown character
      tokens.push({ type: 'unknown', value: remaining[0] })
      remaining = remaining.substring(1)
    }

    return tokens
  }, [])

  const tokens = tokenize(sql)

  return (
    <span className='font-mono'>
      {tokens.map((token, i) => {
        const color =
          colors[token.type as keyof typeof colors] || colors.identifier
        return (
          <span key={i} style={{ color }}>
            {token.value}
          </span>
        )
      })}
    </span>
  )
}

interface Column {
  name: string
  type: string
  nullable?: boolean
  primaryKey?: boolean
  autoIncrement?: boolean
  unique?: boolean
  default?: any
}

interface Table {
  name: string
  columns: Column[]
  foreignKeys?: Array<{
    column: string
    references: { table: string; column: string }
  }>
  indexes?: Array<{
    name: string
    columns: string[]
  }>
  rowCount?: number
}

interface DBSchema {
  $schema?: string
  type?: string
  version?: string
  database?: {
    name?: string
    description?: string
  }
  schema?: {
    tables?: Table[]
    totalRows?: number
  }
  data?: Record<string, any[]>
  metadata?: {
    createdAt?: string
    updatedAt?: string
    createdBy?: string
  }
}

// Helper function to properly quote table names for SQLite
function quoteTableName(tableName: string): string {
  return `"${tableName.replace(/"/g, '""')}"`
}

export function SQLiteSchemaViewer({
  workspaceId,
  databasePath,
  databaseName,
}: SQLiteSchemaViewerProps) {
  const [schema, setSchema] = useState<DBSchema | null>(null)
  const [loadingSchema, setLoadingSchema] = useState(true)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [totalRows, setTotalRows] = useState(0)
  const [schemaExpanded, setSchemaExpanded] = useState(false)
  const [queryExpanded, setQueryExpanded] = useState(false)
  const [tableDropdownOpen, setTableDropdownOpen] = useState(false)
  const [customQuery, setCustomQuery] = useState('')
  const [queryResult, setQueryResult] = useState<any[] | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [executingQuery, setExecutingQuery] = useState(false)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const queryInputRef = useRef<HTMLTextAreaElement>(null)
  const tableDropdownRef = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Derive the relative database path for API calls
  // databasePath format: "ws_xxx/secretaria/tareas-a-revisar.db" or "ws_xxx/mydb.db"
  // We need: "secretaria/tareas-a-revisar" or "mydb"
  const dbPathForApi = databasePath
    .replace(/^[^/]+\//, '')
    .replace(/\.db$/i, '')

  const {
    data: schemaData,
    loading: schemaLoading,
    error: schemaFetchError,
  } = useGetSqliteSchema(workspaceId, dbPathForApi)

  const [executeTableQuery] = useAuthPostWorkspaceApi<{ rows: any[] }>({
    path: '/api/sqlite/query',
    params: { workspaceId },
  })
  const [executeCountQuery] = useAuthPostWorkspaceApi<{
    rows: Array<{ count: number }>
  }>({
    path: '/api/sqlite/query',
    params: { workspaceId },
  })
  const [executeCustomQuery, { loading: executingQueryMutation }] =
    useAuthPostWorkspaceApi<{ rows: any[] }>({
      path: '/api/sqlite/query',
      params: { workspaceId },
    })

  // Detect dark mode - check both class and media query
  useEffect(() => {
    const checkDarkMode = () => {
      const hasDarkClass = document.documentElement.classList.contains('dark')
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches
      setIsDark(hasDarkClass || prefersDark)
    }

    checkDarkMode()

    // Watch for class changes on html element
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // Watch for media query changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkDarkMode)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkDarkMode)
    }
  }, [])

  // Sync schema from SWR hook
  useEffect(() => {
    setLoadingSchema(schemaLoading)
    if (schemaData?.success && schemaData.schema) {
      setSchema({ schema: { tables: schemaData.schema.tables } })
      if (schemaData.schema.tables.length > 0 && !selectedTable) {
        setSelectedTable(schemaData.schema.tables[0].name)
      }
    } else if (schemaFetchError) {
      setSchemaError(
        schemaFetchError instanceof Error
          ? schemaFetchError.message
          : 'Failed to load database schema',
      )
    }
  }, [schemaData, schemaLoading, schemaFetchError])

  // Load table data with pagination
  useEffect(() => {
    if (!selectedTable) return
    setLoadingData(true)
    const offset = (currentPage - 1) * pageSize
    Promise.all([
      executeTableQuery({
        database: dbPathForApi,
        sql: `SELECT * FROM ${quoteTableName(selectedTable)} LIMIT ? OFFSET ?`,
        params: [pageSize, offset],
      }),
      executeCountQuery({
        database: dbPathForApi,
        sql: `SELECT COUNT(*) as count FROM ${quoteTableName(selectedTable)}`,
      }),
    ])
      .then(([data, countData]) => {
        setTableData((data as any)?.rows || [])
        setTotalRows((countData as any)?.rows?.[0]?.count || 0)
      })
      .catch((err) => console.error('Table data query error:', err))
      .finally(() => setLoadingData(false))
  }, [selectedTable, currentPage, pageSize, workspaceId, dbPathForApi])

  // Set default query when table changes and reset sorting
  useEffect(() => {
    if (selectedTable) {
      setCustomQuery(`SELECT * FROM ${quoteTableName(selectedTable)} LIMIT 10`)
      setSortColumn(null)
      setSortDirection('asc')
    }
  }, [selectedTable])

  // Handle column sort
  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnName)
      setSortDirection('asc')
    }
  }

  // Sort data
  const sortedTableData = [...tableData].sort((a, b) => {
    if (!sortColumn) return 0
    const aVal = a[sortColumn]
    const bVal = b[sortColumn]

    // Handle nulls
    if (aVal === null && bVal === null) return 0
    if (aVal === null) return sortDirection === 'asc' ? 1 : -1
    if (bVal === null) return sortDirection === 'asc' ? -1 : 1

    // Compare values
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    }

    const aStr = String(aVal).toLowerCase()
    const bStr = String(bVal).toLowerCase()
    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr)
    }
    return bStr.localeCompare(aStr)
  })

  // Execute custom query
  const executeQuery = async () => {
    if (!customQuery.trim()) return
    try {
      setExecutingQuery(true)
      setQueryError(null)
      const data = await executeCustomQuery({
        database: dbPathForApi,
        sql: customQuery,
      })
      setQueryResult((data as any)?.rows || [])
    } catch (err: any) {
      console.error('Query execution error:', err)
      setQueryError(err?.message || 'Failed to execute query')
    } finally {
      setExecutingQuery(false)
    }
  }

  // Clear query results
  const clearResults = () => {
    setQueryResult(null)
    setQueryError(null)
    if (selectedTable) {
      setCustomQuery(`SELECT * FROM ${quoteTableName(selectedTable)} LIMIT 10`)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tableDropdownRef.current &&
        !tableDropdownRef.current.contains(event.target as Node)
      ) {
        setTableDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loadingSchema) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Spinner size='md' />
      </div>
    )
  }

  if (schemaError || !schema) {
    return (
      <div className='flex h-full items-center justify-center px-8'>
        <div className='w-full max-w-md'>
          <h3 className='text-[28px] font-semibold tracking-tight text-[hsl(var(--text-primary))]'>
            Unable to load schema
          </h3>
          <p className='mt-2 text-[15px] leading-relaxed text-[hsl(var(--text-secondary))]'>
            {schemaError ||
              'An error occurred while loading the database schema.'}
          </p>
        </div>
      </div>
    )
  }

  const tables = schema.schema?.tables || []
  const selectedTableInfo = tables.find((t) => t.name === selectedTable)
  const totalPages = Math.ceil(totalRows / pageSize)

  // Empty state - no tables
  if (tables.length === 0) {
    return (
      <div className='flex h-full px-8 pt-12'>
        <m.div
          className='w-full max-w-lg'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <h3 className='text-[28px] font-semibold tracking-tight text-[hsl(var(--text-primary))]'>
            No tables yet
          </h3>
          <p className='mt-2 text-[15px] leading-relaxed text-[hsl(var(--text-secondary))]'>
            Your database is empty. Tables you create will appear here.
          </p>

          <div className='my-8 h-px bg-[hsl(var(--border))]' />

          <p className='mb-4 text-xs font-medium uppercase tracking-wider text-[hsl(var(--text-tertiary))]'>
            Getting started
          </p>

          <div className='grid grid-cols-2 gap-6'>
            <div>
              <h4 className='text-sm font-medium text-[hsl(var(--text-primary))]'>
                Create a table
              </h4>
              <p className='mt-1 text-[13px] leading-relaxed text-[hsl(var(--text-secondary))]'>
                Run CREATE TABLE statements in any SQL client
              </p>
            </div>
            <div>
              <h4 className='text-sm font-medium text-[hsl(var(--text-primary))]'>
                Import data
              </h4>
              <p className='mt-1 text-[13px] leading-relaxed text-[hsl(var(--text-secondary))]'>
                Load from CSV or external database
              </p>
            </div>
          </div>
        </m.div>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      {/* Header with table dropdown */}
      <div className='flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4'>
        <div className='flex items-center gap-3'>
          <RiDatabase2Line className='h-5 w-5 text-[hsl(var(--text-tertiary))]' />
          <div>
            <h2 className='text-lg font-semibold text-[hsl(var(--text-primary))]'>
              {selectedTable || 'Select a table'}
            </h2>
            {selectedTableInfo && (
              <p className='mt-0.5 text-[13px] text-[hsl(var(--text-secondary))]'>
                {selectedTableInfo.columns.length} columns ·{' '}
                {totalRows.toLocaleString()} rows
              </p>
            )}
          </div>
        </div>

        {/* Table dropdown */}
        <div className='relative' ref={tableDropdownRef}>
          <button
            onClick={() => setTableDropdownOpen(!tableDropdownOpen)}
            className={cn(
              'flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-[13px] transition-colors',
              'hover:bg-[hsl(var(--muted))]/50',
              tableDropdownOpen &&
                'border-[hsl(var(--lazarus-blue))] ring-2 ring-[hsl(var(--lazarus-blue))]/20',
            )}>
            <span className='text-[hsl(var(--text-primary))]'>
              {selectedTable || 'Choose table'}
            </span>
            <m.div
              animate={{ rotate: tableDropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}>
              <RiArrowDownSLine className='h-4 w-4 text-[hsl(var(--text-tertiary))]' />
            </m.div>
          </button>

          {/* Dropdown menu */}
          {tableDropdownOpen && (
            <m.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className='absolute right-0 top-full z-50 mt-1 max-h-64 w-56 overflow-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-1 shadow-lg'>
              {tables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => {
                    setSelectedTable(table.name)
                    setCurrentPage(1)
                    setQueryResult(null)
                    setTableDropdownOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-left transition-colors',
                    selectedTable === table.name
                      ? 'bg-[hsl(var(--lazarus-blue))]/10 text-[hsl(var(--lazarus-blue))]'
                      : 'text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--muted))]',
                  )}>
                  <span className='truncate text-[13px] font-medium'>
                    {table.name}
                  </span>
                  <span
                    className={cn(
                      'text-[11px]',
                      selectedTable === table.name
                        ? 'text-[hsl(var(--lazarus-blue))]/70'
                        : 'text-[hsl(var(--text-tertiary))]',
                    )}>
                    {table.rowCount?.toLocaleString() || 0}
                  </span>
                </button>
              ))}
            </m.div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className='flex flex-1 flex-col overflow-hidden'>
        {selectedTable && selectedTableInfo ? (
          <>
            {/* Collapsible schema section */}
            <div className='border-b border-[hsl(var(--border))] px-6 py-3'>
              <button
                onClick={() => setSchemaExpanded(!schemaExpanded)}
                className='flex w-full items-center gap-2 text-left'>
                <m.div
                  animate={{ rotate: schemaExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}>
                  <RiArrowDownSLine className='h-4 w-4 text-[hsl(var(--text-tertiary))]' />
                </m.div>
                <span className='text-[12px] font-medium text-[hsl(var(--text-secondary))]'>
                  {schemaExpanded ? 'Hide schema' : 'Show schema'}
                </span>
                {!schemaExpanded && (
                  <div className='flex gap-1 overflow-hidden'>
                    {selectedTableInfo.columns.slice(0, 5).map((col) => (
                      <span
                        key={col.name}
                        className='rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 font-mono text-[10px] text-[hsl(var(--text-tertiary))]'>
                        {col.name}
                      </span>
                    ))}
                    {selectedTableInfo.columns.length > 5 && (
                      <span className='text-[10px] text-[hsl(var(--text-tertiary))]'>
                        +{selectedTableInfo.columns.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Expanded schema */}
              <m.div
                initial={false}
                animate={{
                  height: schemaExpanded ? 'auto' : 0,
                  opacity: schemaExpanded ? 1 : 0,
                }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className='overflow-hidden'>
                <div className='mt-3 rounded-lg bg-[hsl(var(--muted))]/30 p-3'>
                  <div className='grid gap-1'>
                    {selectedTableInfo.columns.map((col) => (
                      <div
                        key={col.name}
                        className='flex items-center gap-3 rounded px-2 py-1.5 text-[12px] transition-colors hover:bg-[hsl(var(--muted))]'>
                        <code className='w-32 shrink-0 truncate font-mono font-medium text-[hsl(var(--text-primary))]'>
                          {col.name}
                        </code>
                        <span className='w-20 shrink-0 text-[hsl(var(--text-tertiary))]'>
                          {col.type}
                        </span>
                        <div className='flex gap-1'>
                          {col.primaryKey && (
                            <span className='rounded bg-[hsl(var(--lazarus-blue))]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[hsl(var(--lazarus-blue))]'>
                              PRIMARY KEY
                            </span>
                          )}
                          {col.unique && (
                            <span className='rounded bg-[hsl(var(--lazarus-cyan))]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[hsl(var(--lazarus-cyan))]'>
                              UNIQUE
                            </span>
                          )}
                          {col.nullable === false && (
                            <span className='rounded bg-[hsl(var(--text-tertiary))]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[hsl(var(--text-tertiary))]'>
                              NOT NULL
                            </span>
                          )}
                          {col.autoIncrement && (
                            <span className='rounded bg-[hsl(var(--text-tertiary))]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[hsl(var(--text-tertiary))]'>
                              AUTO
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </m.div>
            </div>

            {/* Data table */}
            <div className='flex-1 overflow-auto'>
              {loadingData || executingQuery ? (
                <div className='flex h-full items-center justify-center'>
                  <Spinner size='md' />
                </div>
              ) : queryResult !== null ? (
                // Query results
                <div className='h-full'>
                  <div className='flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 px-4 py-2'>
                    <span className='text-[12px] text-[hsl(var(--text-secondary))]'>
                      {queryResult.length}{' '}
                      {queryResult.length === 1 ? 'row' : 'rows'} returned
                    </span>
                    <Button
                      variant='secondary'
                      size='small'
                      onClick={clearResults}>
                      Clear
                    </Button>
                  </div>
                  {queryError ? (
                    <div className='p-4'>
                      <p className='text-[13px] text-[hsl(var(--destructive))]'>
                        {queryError}
                      </p>
                    </div>
                  ) : queryResult.length > 0 ? (
                    <div className='overflow-x-auto'>
                      <table className='w-full border-collapse text-[13px]'>
                        <thead className='sticky top-0 z-10 bg-[#f5f5f7] dark:bg-[#2c2c2e]'>
                          <tr>
                            {Object.keys(queryResult[0]).map(
                              (key, colIndex, arr) => (
                                <th
                                  key={key}
                                  className={cn(
                                    'whitespace-nowrap border-b border-[#e5e5e7] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6e6e73] dark:border-[#38383a] dark:text-[#98989d]',
                                    colIndex < arr.length - 1 &&
                                      'border-r border-r-[#e5e5e7]/50 dark:border-r-[#38383a]/50',
                                  )}>
                                  {key}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.map((row, index) => {
                            const keys = Object.keys(row)
                            return (
                              <tr
                                key={index}
                                className='transition-colors hover:bg-[#f0f0f2] dark:hover:bg-[#2c2c2e]'>
                                {keys.map((key, colIndex) => (
                                  <td
                                    key={key}
                                    className={cn(
                                      'border-b border-[#e5e5e7] px-4 py-2.5 dark:border-[#38383a]',
                                      colIndex < keys.length - 1 &&
                                        'border-r border-r-[#e5e5e7]/50 dark:border-r-[#38383a]/50',
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
                    <div className='flex h-32 items-center justify-center'>
                      <p className='text-[13px] text-[hsl(var(--text-secondary))]'>
                        Query returned no results
                      </p>
                    </div>
                  )}
                </div>
              ) : sortedTableData.length > 0 ? (
                <div className='overflow-x-auto'>
                  <table className='w-full border-collapse text-[13px]'>
                    <thead className='sticky top-0 z-10 bg-[#f5f5f7] dark:bg-[#2c2c2e]'>
                      <tr>
                        {selectedTableInfo.columns.map((col, colIndex) => (
                          <th
                            key={col.name}
                            onClick={() => handleSort(col.name)}
                            className={cn(
                              'cursor-pointer select-none whitespace-nowrap border-b border-[#e5e5e7] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors dark:border-[#38383a]',
                              sortColumn === col.name
                                ? 'text-[hsl(var(--lazarus-blue))]'
                                : 'text-[#6e6e73] hover:text-[#424245] dark:text-[#98989d] dark:hover:text-[#a1a1a6]',
                              colIndex < selectedTableInfo.columns.length - 1 &&
                                'border-r border-r-[#e5e5e7]/50 dark:border-r-[#38383a]/50',
                            )}>
                            <div className='flex items-center gap-1'>
                              {col.name}
                              {sortColumn === col.name &&
                                (sortDirection === 'asc' ? (
                                  <RiArrowUpSLine className='h-3.5 w-3.5' />
                                ) : (
                                  <RiArrowDownSLine className='h-3.5 w-3.5' />
                                ))}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTableData.map((row, index) => (
                        <tr
                          key={index}
                          className='transition-colors hover:bg-[#f0f0f2] dark:hover:bg-[#2c2c2e]'>
                          {selectedTableInfo.columns.map((col, colIndex) => (
                            <td
                              key={col.name}
                              className={cn(
                                'border-b border-[#e5e5e7] px-4 py-2.5 dark:border-[#38383a]',
                                colIndex <
                                  selectedTableInfo.columns.length - 1 &&
                                  'border-r border-r-[#e5e5e7]/50 dark:border-r-[#38383a]/50',
                              )}>
                              <SmartCell
                                value={row[col.name]}
                                columnName={col.name}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='flex h-full items-center justify-center'>
                  <p className='text-[13px] text-[hsl(var(--text-secondary))]'>
                    No data in this table
                  </p>
                </div>
              )}
            </div>

            {/* Pagination footer - only show when not in query mode */}
            {queryResult === null && totalPages > 1 && (
              <div className='flex items-center justify-between border-t border-[hsl(var(--border))] px-6 py-3'>
                <span className='text-[12px] text-[hsl(var(--text-secondary))]'>
                  {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, totalRows)} of{' '}
                  {totalRows.toLocaleString()}
                </span>
                <div className='flex items-center gap-1'>
                  <Button
                    variant='secondary'
                    size='small'
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button
                    variant='secondary'
                    size='small'
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Expandable query input at bottom */}
            <div className='border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]'>
              <m.button
                onClick={() => {
                  setQueryExpanded(!queryExpanded)
                  if (!queryExpanded) {
                    setTimeout(() => queryInputRef.current?.focus(), 100)
                  }
                }}
                className='flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-[hsl(var(--muted))]/30'
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                transition={{ duration: 0.15 }}>
                <m.div
                  animate={{ rotate: queryExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}>
                  <RiArrowDownSLine className='h-4 w-4 text-[hsl(var(--text-tertiary))]' />
                </m.div>
                <span className='text-[12px] font-medium text-[hsl(var(--text-secondary))]'>
                  {queryExpanded ? 'Hide query' : 'Run SQL query'}
                </span>
                {!queryExpanded && customQuery && (
                  <div className='ml-2 flex-1 truncate text-[14px]'>
                    <SQLHighlighter sql={customQuery} isDark={isDark} />
                  </div>
                )}
              </m.button>

              <m.div
                initial={false}
                animate={{
                  height: queryExpanded ? 'auto' : 0,
                  opacity: queryExpanded ? 1 : 0,
                }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className='overflow-hidden'>
                <div className='px-4 pb-4'>
                  {/* Query editor with syntax highlighting overlay */}
                  <div className='relative'>
                    <div
                      className={cn(
                        'pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-transparent p-3 text-[13px] leading-relaxed',
                        'font-mono',
                      )}
                      aria-hidden='true'>
                      <SQLHighlighter sql={customQuery} isDark={isDark} />
                    </div>
                    <textarea
                      ref={queryInputRef}
                      value={customQuery}
                      onChange={(e) => setCustomQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault()
                          executeQuery()
                        }
                      }}
                      placeholder='SELECT * FROM table LIMIT 10'
                      className={cn(
                        'w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-3 text-[13px] leading-relaxed text-transparent caret-[hsl(var(--text-primary))]',
                        'font-mono placeholder:text-[hsl(var(--text-tertiary))]',
                        'focus:border-[hsl(var(--lazarus-blue))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--lazarus-blue))]/20',
                        'min-h-[80px]',
                      )}
                      spellCheck={false}
                    />
                  </div>

                  {/* Query error */}
                  {queryError && (
                    <p className='mt-2 text-[12px] text-[hsl(var(--destructive))]'>
                      {queryError}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className='mt-3 flex items-center justify-between'>
                    <span className='text-[11px] text-[hsl(var(--text-tertiary))]'>
                      Press{' '}
                      {navigator.platform?.includes('Mac') ? 'Cmd' : 'Ctrl'}
                      +Enter to run
                    </span>
                    <Button
                      variant='primary'
                      size='small'
                      onClick={executeQuery}
                      disabled={!customQuery.trim() || executingQuery}
                      loading={executingQuery}
                      iconLeft={
                        !executingQuery && (
                          <RiPlayLine className='h-3.5 w-3.5' />
                        )
                      }>
                      {executingQuery ? 'Running' : 'Run query'}
                    </Button>
                  </div>
                </div>
              </m.div>
            </div>
          </>
        ) : (
          // No table selected state
          <div className='flex h-full items-center justify-center'>
            <m.div
              className='text-center'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}>
              <p className='text-[15px] text-[hsl(var(--text-secondary))]'>
                Select a table to view its data
              </p>
            </m.div>
          </div>
        )}
      </div>
    </div>
  )
}
