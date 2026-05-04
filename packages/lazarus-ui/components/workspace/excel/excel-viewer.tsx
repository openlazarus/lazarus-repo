'use client'

import { RiTableLine } from '@remixicon/react'
import { useEffect, useRef, useState } from 'react'

import { fileService } from '@/app/(main)/files/components/services/file.service'
import Spinner from '@/components/ui/spinner'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

interface ExcelViewerProps {
  workspaceId: string
  filePath: string
  fileName: string
  userId?: string
}

interface CellStyle {
  backgroundColor?: string
  color?: string
  fontWeight?: string
  fontStyle?: string
  textDecoration?: string
  textAlign?: string
  verticalAlign?: string
  fontSize?: string
  borderTop?: string
  borderBottom?: string
  borderLeft?: string
  borderRight?: string
}

interface StyledCell {
  value: string
  style: CellStyle
  colSpan?: number
  rowSpan?: number
}

interface StyledSheet {
  name: string
  columnCount: number
  rows: StyledCell[][]
  columnWidths: number[]
}

/** Convert ARGB hex (e.g. "FF0000FF") to CSS color */
function argbToColor(argb?: string): string | undefined {
  if (!argb || argb === '00000000') return undefined
  // ARGB: first 2 chars are alpha, rest is RGB
  const rgb = argb.length === 8 ? argb.substring(2) : argb
  return `#${rgb}`
}

/** Convert ExcelJS border style to CSS border string */
function borderToCss(border?: {
  style?: string
  color?: { argb?: string; theme?: number }
}): string | undefined {
  if (!border || !border.style || border.style === 'none') return undefined
  const color = argbToColor(border.color?.argb) || '#999'
  const widthMap: Record<string, string> = {
    thin: '1px',
    medium: '2px',
    thick: '3px',
    hair: '1px',
    dotted: '1px',
    dashed: '1px',
    double: '3px',
  }
  const styleMap: Record<string, string> = {
    thin: 'solid',
    medium: 'solid',
    thick: 'solid',
    hair: 'solid',
    dotted: 'dotted',
    dashed: 'dashed',
    double: 'double',
    dashDot: 'dashed',
    dashDotDot: 'dashed',
    slantDashDot: 'dashed',
    mediumDashed: 'dashed',
    mediumDashDot: 'dashed',
    mediumDashDotDot: 'dashed',
  }
  const width = widthMap[border.style] || '1px'
  const style = styleMap[border.style] || 'solid'
  return `${width} ${style} ${color}`
}

/** Format cell value based on numFmt */
function formatValue(value: any): string {
  if (value == null) return ''
  if (value instanceof Date) {
    return value.toLocaleDateString()
  }
  if (typeof value === 'object' && value.richText) {
    // Rich text: concatenate all text parts
    return value.richText.map((rt: any) => rt.text).join('')
  }
  if (typeof value === 'object' && value.text) {
    return String(value.text)
  }
  if (typeof value === 'object' && value.result !== undefined) {
    // Formula result
    return String(value.result)
  }
  return String(value)
}

export function ExcelViewer({ workspaceId, filePath }: ExcelViewerProps) {
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheets, setSheets] = useState<StyledSheet[]>([])
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadExcel() {
      if (!workspaceId) {
        setError('Workspace ID is required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const cleanPath = filePath.includes('/')
          ? filePath.split('/').slice(1).join('/')
          : filePath

        const response = await fileService.readFile(
          'user',
          workspaceId,
          cleanPath,
          '',
        )

        if (response.encoding !== 'base64') {
          setError('Invalid file encoding. Expected binary file.')
          setLoading(false)
          return
        }

        // Decode base64 to buffer
        const binaryString = atob(response.content)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        // Dynamic import to avoid SSR issues
        const ExcelJS = await import('exceljs')
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(bytes.buffer)

        const parsedSheets: StyledSheet[] = []

        workbook.eachSheet((worksheet) => {
          const rowCount = worksheet.rowCount
          const colCount = worksheet.columnCount
          if (colCount === 0) {
            parsedSheets.push({
              name: worksheet.name,
              columnCount: 0,
              rows: [],
              columnWidths: [],
            })
            return
          }

          // Get column widths
          const columnWidths: number[] = []
          for (let c = 1; c <= colCount; c++) {
            const col = worksheet.getColumn(c)
            // ExcelJS width is in characters, convert to approximate pixels
            columnWidths.push(col.width ? Math.max(col.width * 8, 60) : 100)
          }

          const rows: StyledCell[][] = []

          for (let r = 1; r <= rowCount; r++) {
            const row = worksheet.getRow(r)
            const cells: StyledCell[] = []

            for (let c = 1; c <= colCount; c++) {
              const cell = row.getCell(c)
              const style: CellStyle = {}

              // Font styles
              if (cell.font) {
                if (cell.font.bold) style.fontWeight = 'bold'
                if (cell.font.italic) style.fontStyle = 'italic'
                if (cell.font.underline) style.textDecoration = 'underline'
                if (cell.font.strike) {
                  style.textDecoration = style.textDecoration
                    ? `${style.textDecoration} line-through`
                    : 'line-through'
                }
                if (cell.font.color?.argb) {
                  const color = argbToColor(cell.font.color.argb)
                  if (color) style.color = color
                }
                if (cell.font.size) {
                  style.fontSize = `${cell.font.size}pt`
                }
              }

              // Fill / background color
              if (
                cell.fill &&
                cell.fill.type === 'pattern' &&
                cell.fill.pattern === 'solid'
              ) {
                const fg = (cell.fill as any).fgColor
                if (fg?.argb) {
                  const bg = argbToColor(fg.argb)
                  if (bg && bg !== '#000000') style.backgroundColor = bg
                }
              }

              // Alignment
              if (cell.alignment) {
                if (cell.alignment.horizontal) {
                  style.textAlign =
                    cell.alignment.horizontal === 'fill'
                      ? 'left'
                      : cell.alignment.horizontal
                }
                if (cell.alignment.vertical) {
                  const vMap: Record<string, string> = {
                    top: 'top',
                    middle: 'middle',
                    bottom: 'bottom',
                  }
                  style.verticalAlign =
                    vMap[cell.alignment.vertical] || 'middle'
                }
              }

              // Borders
              if (cell.border) {
                const bt = borderToCss(cell.border.top)
                const bb = borderToCss(cell.border.bottom)
                const bl = borderToCss(cell.border.left)
                const br = borderToCss(cell.border.right)
                if (bt) style.borderTop = bt
                if (bb) style.borderBottom = bb
                if (bl) style.borderLeft = bl
                if (br) style.borderRight = br
              }

              cells.push({
                value: formatValue(cell.value),
                style,
              })
            }

            rows.push(cells)
          }

          // Handle merged cells
          const merges = (worksheet as any)._merges || {}
          for (const key of Object.keys(merges)) {
            const merge = merges[key]?.model || merges[key]
            if (!merge) continue
            const { top, left, bottom, right } = merge
            if (rows[top - 1]?.[left - 1]) {
              rows[top - 1][left - 1].colSpan = right - left + 1
              rows[top - 1][left - 1].rowSpan = bottom - top + 1
            }
          }

          parsedSheets.push({
            name: worksheet.name,
            columnCount: colCount,
            rows,
            columnWidths,
          })
        })

        setSheets(parsedSheets)
      } catch (err: any) {
        console.error('Error loading Excel file:', err)
        setError(err?.message || 'Failed to load Excel file')
      } finally {
        setLoading(false)
      }
    }

    loadExcel()
  }, [filePath, workspaceId])

  // Scroll to top when sheet changes
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0
      tableContainerRef.current.scrollLeft = 0
    }
  }, [activeSheetIndex, loading])

  if (loading) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <Spinner size='md' />
          <p className='text-sm text-muted-foreground'>
            Loading spreadsheet...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-3'>
          <RiTableLine className='h-12 w-12 text-muted-foreground' />
          <p className='text-sm text-destructive'>Error: {error}</p>
        </div>
      </div>
    )
  }

  const activeSheet = sheets[activeSheetIndex]

  if (!activeSheet || activeSheet.rows.length === 0) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <p className='text-sm text-muted-foreground'>
          No data found in spreadsheet
        </p>
      </div>
    )
  }

  // Track which cells are hidden by merges
  const hiddenCells = new Set<string>()
  activeSheet.rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (
        (cell.colSpan && cell.colSpan > 1) ||
        (cell.rowSpan && cell.rowSpan > 1)
      ) {
        const rs = cell.rowSpan || 1
        const cs = cell.colSpan || 1
        for (let dr = 0; dr < rs; dr++) {
          for (let dc = 0; dc < cs; dc++) {
            if (dr === 0 && dc === 0) continue
            hiddenCells.add(`${ri + dr}:${ci + dc}`)
          }
        }
      }
    })
  })

  return (
    <div className='flex h-full w-full flex-col'>
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div
          className={cn(
            'flex flex-shrink-0 items-center gap-1 border-b px-4 py-2',
            isDark
              ? 'border-white/10 bg-[#1a1a1b]'
              : 'border-black/10 bg-gray-50',
          )}>
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheetIndex(index)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeSheetIndex === index
                  ? isDark
                    ? 'bg-white/10 text-white'
                    : 'bg-black/10 text-black'
                  : isDark
                    ? 'text-white/60 hover:bg-white/5 hover:text-white/80'
                    : 'text-black/60 hover:bg-black/5 hover:text-black/80',
              )}>
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* Table content */}
      <div ref={tableContainerRef} className='flex-1 overflow-auto'>
        <table
          className='border-collapse text-sm'
          style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {/* Row number column */}
            <col style={{ width: '50px', minWidth: '50px' }} />
            {activeSheet.columnWidths.map((w, i) => (
              <col key={i} style={{ width: `${w}px`, minWidth: '60px' }} />
            ))}
          </colgroup>
          <thead>
            <tr
              className={cn(
                'sticky top-0 z-10',
                isDark ? 'bg-[#1a1a1b]' : 'bg-gray-100',
              )}>
              <th
                className={cn(
                  'border-b border-r px-2 py-1.5 text-center text-xs font-medium',
                  isDark
                    ? 'border-white/10 bg-[#1a1a1b] text-white/40'
                    : 'border-black/10 bg-gray-100 text-black/40',
                )}
              />
              {Array.from({ length: activeSheet.columnCount }, (_, i) => {
                let colName = ''
                let n = i
                do {
                  colName = String.fromCharCode(65 + (n % 26)) + colName
                  n = Math.floor(n / 26) - 1
                } while (n >= 0)
                return (
                  <th
                    key={i}
                    className={cn(
                      'border-b border-r px-2 py-1.5 text-center text-xs font-medium',
                      isDark
                        ? 'border-white/10 bg-[#1a1a1b] text-white/40'
                        : 'border-black/10 bg-gray-100 text-black/40',
                    )}>
                    {colName}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {activeSheet.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {/* Row number */}
                <td
                  className={cn(
                    'border-b border-r px-2 py-1 text-center text-xs',
                    isDark
                      ? 'border-white/10 bg-[#1a1a1b] text-white/40'
                      : 'border-black/10 bg-gray-50 text-black/40',
                  )}>
                  {rowIndex + 1}
                </td>
                {row.map((cell, colIndex) => {
                  // Skip cells hidden by merges
                  if (hiddenCells.has(`${rowIndex}:${colIndex}`)) return null

                  const hasCustomBg = !!cell.style.backgroundColor
                  const defaultBorder = isDark
                    ? '1px solid rgba(255,255,255,0.06)'
                    : '1px solid rgba(0,0,0,0.06)'

                  return (
                    <td
                      key={colIndex}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      style={{
                        backgroundColor:
                          cell.style.backgroundColor || undefined,
                        color:
                          cell.style.color ||
                          (hasCustomBg ? '#000' : undefined),
                        fontWeight: cell.style.fontWeight,
                        fontStyle: cell.style.fontStyle,
                        textDecoration: cell.style.textDecoration,
                        textAlign: (cell.style.textAlign as any) || undefined,
                        verticalAlign: cell.style.verticalAlign || 'middle',
                        fontSize: cell.style.fontSize,
                        borderTop: cell.style.borderTop || defaultBorder,
                        borderBottom: cell.style.borderBottom || defaultBorder,
                        borderLeft: cell.style.borderLeft || defaultBorder,
                        borderRight: cell.style.borderRight || defaultBorder,
                        padding: '4px 8px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                      {cell.value}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
