'use client'

import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiFileCopyLine,
  RiSearchLine,
} from '@remixicon/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CSVViewerProps {
  content: string
  onChange?: (content: string) => void
  fileId?: string // Unique identifier for the file to persist column widths
}

interface ParsedCSV {
  headers: string[]
  rows: string[][]
}

type SortDirection = 'asc' | 'desc' | null

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote - add one quote and skip next
        current += '"'
        i++
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
  result.push(current.trim())

  return result
}

function parseCSV(content: string): ParsedCSV {
  const lines = content.trim().split('\n')
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  // Parse header
  const headers = parseCSVLine(lines[0])

  // Parse rows
  const rows = lines.slice(1).map((line) => parseCSVLine(line))

  return { headers, rows }
}

function escapeCSVField(field: string): string {
  // If field contains comma, quote, or newline, wrap in quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    // Escape existing quotes by doubling them
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

function serializeCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSVField).join(',')
  const dataLines = rows.map((row) => row.map(escapeCSVField).join(','))
  return [headerLine, ...dataLines].join('\n')
}

// Detect cell type and format appropriately
type CellType = 'number' | 'date' | 'boolean' | 'string' | 'empty'

function detectCellType(value: string): CellType {
  if (!value || value.trim() === '') return 'empty'

  const trimmed = value.trim()

  // Check for boolean
  if (trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'false') {
    return 'boolean'
  }

  // Check for number (including negative, decimals, percentages, currency)
  const numericPattern = /^-?\d+\.?\d*%?$|^\$-?\d+\.?\d*$/
  if (numericPattern.test(trimmed.replace(/,/g, ''))) {
    return 'number'
  }

  // Check for date (ISO format, US format, etc.)
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // ISO date (YYYY-MM-DD)
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // US date (MM/DD/YYYY)
    /^\d{1,2}-\d{1,2}-\d{4}$/, // Dash date (MM-DD-YYYY)
    /^\d{4}\/\d{2}\/\d{2}$/, // Japanese date (YYYY/MM/DD)
  ]

  for (const pattern of datePatterns) {
    if (pattern.test(trimmed)) {
      const date = new Date(trimmed)
      if (!isNaN(date.getTime())) {
        return 'date'
      }
    }
  }

  return 'string'
}

function formatCellValue(value: string, type: CellType): string {
  if (type === 'empty') return ''

  const trimmed = value.trim()

  if (type === 'number') {
    // Remove currency symbols and commas for parsing
    const cleaned = trimmed.replace(/[$,]/g, '')
    const num = parseFloat(cleaned)

    if (isNaN(num)) return trimmed

    // Check if original had currency symbol
    if (trimmed.startsWith('$')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(num)
    }

    // Check if original had percentage
    if (trimmed.endsWith('%')) {
      return `${num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}%`
    }

    // Regular number formatting
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }

  if (type === 'date') {
    const date = new Date(trimmed)
    if (!isNaN(date.getTime())) {
      // Format as locale date string
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
  }

  if (type === 'boolean') {
    return trimmed.toLowerCase() === 'true' ? 'Yes' : 'No'
  }

  return trimmed
}

function getCellAlignment(type: CellType): 'left' | 'right' | 'center' {
  if (type === 'number') return 'right'
  if (type === 'boolean') return 'center'
  return 'left'
}

export function CSVViewer({ content, onChange, fileId }: CSVViewerProps) {
  const [data, setData] = useState<ParsedCSV>({ headers: [], rows: [] })
  const [editingCell, setEditingCell] = useState<{
    row: number
    col: number
  } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showToolbar, setShowToolbar] = useState(true)
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({})
  const [resizingColumn, setResizingColumn] = useState<number | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)

  // Load column widths from localStorage
  useEffect(() => {
    if (!fileId) return

    const storageKey = `csv-column-widths-${fileId}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setColumnWidths(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load column widths:', error)
      }
    }
  }, [fileId])

  // Save column widths to localStorage
  const saveColumnWidths = (widths: Record<number, number>) => {
    if (!fileId) return

    const storageKey = `csv-column-widths-${fileId}`
    localStorage.setItem(storageKey, JSON.stringify(widths))
  }

  useEffect(() => {
    try {
      const parsed = parseCSV(content)
      setData(parsed)
    } catch (error) {
      console.error('Failed to parse CSV:', error)
      setData({ headers: [], rows: [] })
    }
  }, [content])

  // Filtered and sorted data
  const processedRows = useMemo(() => {
    let result = [...data.rows]

    // Filter by search term
    if (searchTerm) {
      result = result.filter((row) =>
        row.some((cell) =>
          cell.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      )
    }

    // Sort by column
    if (sortColumn !== null && sortDirection) {
      result.sort((a, b) => {
        const aVal = a[sortColumn] || ''
        const bVal = b[sortColumn] || ''

        // Try numeric sort first
        const aNum = parseFloat(aVal)
        const bNum = parseFloat(bVal)

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
        }

        // Fall back to string sort
        const comparison = aVal.localeCompare(bVal)
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [data.rows, searchTerm, sortColumn, sortDirection])

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortColumn(null)
      }
    } else {
      setSortColumn(columnIndex)
      setSortDirection('asc')
    }
  }

  const handleCellDoubleClick = (rowIndex: number, colIndex: number) => {
    setEditingCell({ row: rowIndex, col: colIndex })
    setEditValue(data.rows[rowIndex][colIndex])
  }

  const handleCellEdit = (
    rowIndex: number,
    colIndex: number,
    value: string,
  ) => {
    const newRows = [...data.rows]
    newRows[rowIndex][colIndex] = value
    const newData = { ...data, rows: newRows }
    setData(newData)
    setEditingCell(null)

    // Notify parent of changes
    if (onChange) {
      onChange(serializeCSV(newData.headers, newData.rows))
    }
  }

  const handleAddRow = () => {
    const newRow = new Array(data.headers.length).fill('')
    const newRows = [...data.rows, newRow]
    const newData = { ...data, rows: newRows }
    setData(newData)

    if (onChange) {
      onChange(serializeCSV(newData.headers, newData.rows))
    }
  }

  const handleDeleteRows = () => {
    if (selectedRows.size === 0) return

    const newRows = data.rows.filter((_, index) => !selectedRows.has(index))
    const newData = { ...data, rows: newRows }
    setData(newData)
    setSelectedRows(new Set())

    if (onChange) {
      onChange(serializeCSV(newData.headers, newData.rows))
    }
  }

  const handleToggleRowSelection = (rowIndex: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex)
    } else {
      newSelected.add(rowIndex)
    }
    setSelectedRows(newSelected)
  }

  const handleExport = () => {
    const csvContent = serializeCSV(data.headers, data.rows)
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `export_${new Date().getTime()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopyContent = async () => {
    try {
      const csvContent = serializeCSV(data.headers, data.rows)
      await navigator.clipboard.writeText(csvContent)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy content:', error)
    }
  }

  // Column resize handlers
  const handleResizeStart = (
    e: React.MouseEvent,
    columnIndex: number,
    currentWidth: number,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingColumn(columnIndex)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = currentWidth
  }

  useEffect(() => {
    if (resizingColumn === null) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const delta = e.clientX - resizeStartX.current
      const newWidth = Math.max(80, resizeStartWidth.current + delta)

      setColumnWidths((prev) => {
        const updated = { ...prev, [resizingColumn]: newWidth }
        return updated
      })
    }

    const handleMouseUp = () => {
      setResizingColumn(null)
      // Save to localStorage after resize is complete
      saveColumnWidths(columnWidths)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    // Add cursor override to body during resize
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizingColumn, columnWidths, fileId])

  if (data.headers.length === 0) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-center'>
          <p className='text-sm text-[#8e8e93] dark:text-[#636366]'>
            No CSV data to display
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full w-full flex-col bg-card dark:bg-background'>
      {/* Toolbar */}
      <div className='border-b border-black/[0.06] bg-[#fafafa] px-3 py-2 dark:border-white/[0.08] dark:bg-[#1a1a1c]'>
        <div className='flex items-center gap-2'>
          {/* Search */}
          <div className='relative max-w-xs flex-1'>
            <RiSearchLine className='absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8e8e93] dark:text-[#636366]' />
            <Input
              placeholder='Search...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='h-7 border-0 bg-white pl-8 pr-8 text-xs dark:bg-[#2c2c2e]'
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className='absolute right-2 top-1/2 -translate-y-1/2 text-[#8e8e93] hover:text-[#1d1d1f] dark:text-[#636366] dark:hover:text-[#f5f5f7]'>
                <RiCloseLine className='h-3 w-3' />
              </button>
            )}
          </div>

          <div className='h-4 w-px bg-black/[0.1] dark:bg-white/[0.1]' />

          {/* Actions */}
          <Button
            variant='secondary'
            size='small'
            onClick={handleAddRow}
            className='h-7 gap-1.5 px-2 text-xs'>
            <RiAddLine className='h-3.5 w-3.5' />
            Add Row
          </Button>

          <Button
            variant='secondary'
            size='small'
            onClick={handleDeleteRows}
            disabled={selectedRows.size === 0}
            className='h-7 gap-1.5 px-2 text-xs text-[#ff3b30] hover:text-[#ff3b30] disabled:opacity-30'>
            <RiDeleteBinLine className='h-3.5 w-3.5' />
            Delete ({selectedRows.size})
          </Button>

          <div className='h-4 w-px bg-black/[0.1] dark:bg-white/[0.1]' />

          <Button
            variant='secondary'
            size='small'
            onClick={handleCopyContent}
            className='h-7 gap-1.5 px-2 text-xs'>
            {isCopied ? (
              <>
                <RiCheckLine className='h-3.5 w-3.5 text-[#0098FC]' />
                Copied
              </>
            ) : (
              <>
                <RiFileCopyLine className='h-3.5 w-3.5' />
                Copy
              </>
            )}
          </Button>

          <Button
            variant='secondary'
            size='small'
            onClick={handleExport}
            className='h-7 gap-1.5 px-2 text-xs'>
            <RiDownloadLine className='h-3.5 w-3.5' />
            Export
          </Button>

          {/* Info */}
          <div className='ml-auto text-xs text-[#8e8e93] dark:text-[#636366]'>
            {processedRows.length} rows × {data.headers.length} columns
          </div>
        </div>
      </div>

      {/* Table */}
      <div className='flex-1 overflow-auto'>
        <table
          className='w-full border-separate border-spacing-0'
          style={{ tableLayout: 'fixed' }}>
          <thead className='sticky top-0 z-10'>
            <tr>
              {/* Checkbox column */}
              <th className='sticky left-0 z-20 w-10 border-b border-r border-black/[0.06] bg-[#f5f5f7] px-2 py-1.5 dark:border-white/[0.06] dark:bg-[#2c2c2e]'>
                <input
                  type='checkbox'
                  checked={
                    selectedRows.size === data.rows.length &&
                    data.rows.length > 0
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(
                        new Set(data.rows.map((_, index) => index)),
                      )
                    } else {
                      setSelectedRows(new Set())
                    }
                  }}
                  className='h-3.5 w-3.5 cursor-pointer accent-[#007aff] dark:accent-[#0a84ff]'
                />
              </th>

              {/* Data columns */}
              {data.headers.map((header, index) => {
                const width = columnWidths[index]
                return (
                  <th
                    key={index}
                    style={{
                      width: width ? `${width}px` : 'auto',
                      minWidth: width ? `${width}px` : '100px',
                      maxWidth: width ? `${width}px` : 'none',
                    }}
                    className='group/header relative border-b border-r border-black/[0.06] bg-[#f5f5f7] px-3 py-1.5 text-left text-xs font-medium text-[#424245] transition-colors duration-150 dark:border-white/[0.06] dark:bg-[#2c2c2e] dark:text-[#a1a1a6] [&:last-child]:border-r-0'>
                    <div
                      onClick={() => handleSort(index)}
                      className='flex cursor-pointer items-center gap-1.5 hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'>
                      <span className='truncate'>{header}</span>
                      {sortColumn === index && (
                        <span className='text-[#007aff] dark:text-[#0a84ff]'>
                          {sortDirection === 'asc' ? (
                            <RiArrowUpLine className='h-3 w-3' />
                          ) : (
                            <RiArrowDownLine className='h-3 w-3' />
                          )}
                        </span>
                      )}
                    </div>
                    {/* Resize handle - wider hit area */}
                    <div
                      onMouseDown={(e) => {
                        const th = e.currentTarget.parentElement
                        const currentWidth = th?.offsetWidth || 150
                        handleResizeStart(e, index, currentWidth)
                      }}
                      className='absolute -right-2 top-0 flex h-full w-4 cursor-col-resize items-center justify-center transition-colors hover:bg-[#007aff]/10 active:bg-[#007aff]/20 dark:hover:bg-[#0a84ff]/10 dark:active:bg-[#0a84ff]/20'
                      onClick={(e) => e.stopPropagation()}
                      title='Drag to resize column'>
                      <div className='h-4 w-px bg-black/[0.2] transition-all group-hover/header:bg-[#007aff]/40 dark:bg-white/[0.2] dark:group-hover/header:bg-[#0a84ff]/40' />
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {processedRows.map((row, rowIndex) => {
              const originalIndex = data.rows.indexOf(row)
              const isSelected = selectedRows.has(originalIndex)

              return (
                <tr
                  key={rowIndex}
                  className='group transition-colors duration-150'>
                  {/* Checkbox column */}
                  <td className='sticky left-0 z-10 border-b border-r border-black/[0.04] bg-white px-2 py-1.5 text-center dark:border-white/[0.04] dark:bg-[#1c1c1e]'>
                    <input
                      type='checkbox'
                      checked={isSelected}
                      onChange={() => handleToggleRowSelection(originalIndex)}
                      className='h-3.5 w-3.5 cursor-pointer accent-[#007aff] dark:accent-[#0a84ff]'
                    />
                  </td>

                  {/* Data cells */}
                  {row.map((cell, cellIndex) => {
                    const isEditing =
                      editingCell?.row === originalIndex &&
                      editingCell?.col === cellIndex
                    const width = columnWidths[cellIndex]
                    const cellType = detectCellType(cell)
                    const formattedValue = formatCellValue(cell, cellType)
                    const alignment = getCellAlignment(cellType)

                    return (
                      <td
                        key={cellIndex}
                        style={{
                          width: width ? `${width}px` : 'auto',
                          minWidth: width ? `${width}px` : '100px',
                          maxWidth: width ? `${width}px` : 'none',
                          textAlign: alignment,
                        }}
                        onDoubleClick={() =>
                          handleCellDoubleClick(originalIndex, cellIndex)
                        }
                        className='overflow-hidden border-b border-r border-black/[0.04] bg-white px-3 py-1.5 text-[13px] leading-snug text-[#1d1d1f] transition-colors duration-150 hover:bg-[#007aff]/[0.04] dark:border-white/[0.04] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:bg-[#0a84ff]/[0.06] [&:last-child]:border-r-0 [tr:nth-child(even)>&]:bg-[#fafafa]/40 [tr:nth-child(even)>&]:hover:bg-[#007aff]/[0.04] [tr:nth-child(even)>&]:dark:bg-[#1a1a1c]/40 [tr:nth-child(even)>&]:dark:hover:bg-[#0a84ff]/[0.06]'>
                        {isEditing ? (
                          <input
                            type='text'
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() =>
                              handleCellEdit(
                                originalIndex,
                                cellIndex,
                                editValue,
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCellEdit(
                                  originalIndex,
                                  cellIndex,
                                  editValue,
                                )
                              } else if (e.key === 'Escape') {
                                setEditingCell(null)
                              }
                            }}
                            autoFocus
                            style={{ textAlign: alignment }}
                            className='w-full border-none bg-transparent px-0 py-0 text-[13px] leading-snug text-[#1d1d1f] outline-none dark:text-[#f5f5f7]'
                          />
                        ) : (
                          <div
                            className='truncate'
                            style={{
                              fontVariantNumeric:
                                cellType === 'number'
                                  ? 'tabular-nums'
                                  : 'normal',
                              fontWeight: cellType === 'number' ? 500 : 400,
                            }}>
                            {formattedValue}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
