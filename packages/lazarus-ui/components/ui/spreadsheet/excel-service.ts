/**
 * Excel Import/Export Service
 * Handles conversion between Excel files and Lazarus spreadsheet format
 */

import * as XLSX from 'xlsx'

import {
  aiToExcelFormula,
  excelToAIFormula,
  isAIFormula,
  isExcelFormula,
} from './formula-converter'
import { detectCellType } from './parser'
import {
  CellOriginal,
  CellType,
  Column,
  ParsedSpreadsheetData,
  SpreadsheetMeta,
} from './types'

export interface ImportResult {
  success: boolean
  data?: ParsedSpreadsheetData
  warnings?: string[]
  errors?: string[]
}

export interface ExportOptions {
  filename?: string
  convertAIFormulas?: boolean // If true, try to convert AI formulas to Excel formulas
  includeMetadata?: boolean
}

/**
 * Import an Excel file and convert to ParsedSpreadsheetData format
 */
export async function importExcelFile(file: File): Promise<ImportResult> {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    // Read the file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellFormula: true,
      cellStyles: true,
      cellDates: true,
    })

    // Convert workbook to our format
    const sheets = workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName]
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

      // Extract columns from first row
      const columns: Column[] = []
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        const cell = worksheet[cellAddress]
        const header = cell
          ? String(cell.v)
          : `Column ${String.fromCharCode(65 + col)}`

        columns.push({
          id: String.fromCharCode(65 + col),
          header,
          type: 'text',
          width: 100,
        })
      }

      // Extract cell data
      const cells = new Map<string, CellOriginal>()

      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          const cell = worksheet[cellAddress]

          if (!cell) continue

          const columnId = String.fromCharCode(65 + col)
          const cellRef = `${columnId}${row}`

          // Extract value
          let value: string | number | Date | null = null
          let formula: string | undefined
          let type: CellType = 'text'

          // Check for formula
          if (cell.f) {
            const excelFormula = `=${cell.f}`
            const conversion = excelToAIFormula(excelFormula)

            if (conversion.converted) {
              formula = conversion.formula
              type = 'formula'
              // Use calculated value as fallback
              value = cell.v !== undefined ? cell.v : null
            } else {
              // Keep original Excel formula
              formula = excelFormula
              type = 'formula'
              value = cell.v !== undefined ? cell.v : null

              if (conversion.note) {
                warnings.push(
                  `${cellRef}: ${conversion.note} - Formula: ${excelFormula}`,
                )
              }
            }
          } else {
            // Regular value
            value = cell.v !== undefined ? cell.v : null

            // Detect type based on Excel cell type
            if (cell.t === 'n') {
              type = 'number'
              // Check if it's currency or percentage based on format
              if (cell.z && cell.z.includes('$')) {
                type = 'currency'
              } else if (cell.z && cell.z.includes('%')) {
                type = 'percentage'
              }
            } else if (cell.t === 'd') {
              type = 'date'
            } else {
              type = detectCellType(value)
            }
          }

          cells.set(cellRef, {
            value,
            formula,
            type,
            style: 'default',
          })
        }
      }

      return {
        name: sheetName,
        columns,
        cells,
        formatting: [],
        charts: [],
        validation: [],
        analysis: [],
      }
    })

    // Create metadata
    const meta: SpreadsheetMeta = {
      title: file.name.replace(/\.(xlsx?|csv)$/i, ''),
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const result: ParsedSpreadsheetData = {
      meta,
      sheets,
    }

    return {
      success: true,
      data: result,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    console.error('Excel import error:', error)
    return {
      success: false,
      errors: [
        error instanceof Error ? error.message : 'Failed to import Excel file',
      ],
    }
  }
}

/**
 * Export ParsedSpreadsheetData to Excel file
 */
export function exportToExcel(
  data: ParsedSpreadsheetData,
  options: ExportOptions = {},
): void {
  const {
    filename = 'spreadsheet.xlsx',
    convertAIFormulas = true,
    includeMetadata = true,
  } = options

  try {
    const workbook = XLSX.utils.book_new()

    // Add metadata as properties if requested
    if (includeMetadata && data.meta) {
      workbook.Props = {
        Title: data.meta.title || 'Untitled',
        Author: data.meta.author || 'Lazarus',
        CreatedDate: data.meta.createdAt
          ? new Date(data.meta.createdAt)
          : new Date(),
      }
    }

    // Convert each sheet
    data.sheets.forEach((sheet) => {
      const worksheet: XLSX.WorkSheet = {}
      const range = {
        s: { c: 0, r: 0 },
        e: { c: sheet.columns.length - 1, r: 0 },
      }

      // Add headers
      sheet.columns.forEach((column, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex })
        worksheet[cellAddress] = {
          t: 's',
          v: column.header,
        }
      })

      // Find max row
      let maxRow = 0
      sheet.cells.forEach((cell, cellRef) => {
        const match = cellRef.match(/^([A-Z]+)(\d+)$/)
        if (match) {
          const row = parseInt(match[2])
          maxRow = Math.max(maxRow, row)
        }
      })

      range.e.r = maxRow

      // Add cell data
      sheet.cells.forEach((cell, cellRef) => {
        const match = cellRef.match(/^([A-Z]+)(\d+)$/)
        if (!match) return

        const colId = match[1]
        const rowNum = parseInt(match[2])

        // Convert column ID to index
        const colIndex = sheet.columns.findIndex((c) => c.id === colId)
        if (colIndex === -1) return

        const excelAddress = XLSX.utils.encode_cell({ r: rowNum, c: colIndex })

        // Handle formulas
        if (cell.formula) {
          if (isAIFormula(cell.formula) && convertAIFormulas) {
            // Try to convert AI formula to Excel formula
            const conversion = aiToExcelFormula(cell.formula)

            if (conversion.converted) {
              // Use converted Excel formula
              const formula = conversion.formula.replace(/^=/, '')
              worksheet[excelAddress] = {
                t: 'n',
                f: formula,
                v: cell.value !== null ? cell.value : 0,
              }
            } else {
              // Can't convert - use calculated value with note
              worksheet[excelAddress] = {
                t: getCellType(cell.type),
                v: cell.value !== null ? cell.value : 'N/A',
                c: [
                  {
                    a: 'Lazarus',
                    t: `Original AI formula: ${cell.formula}`,
                  },
                ],
              }
            }
          } else if (isExcelFormula(cell.formula)) {
            // Use Excel formula as-is
            const formula = cell.formula.replace(/^=/, '')
            worksheet[excelAddress] = {
              t: 'n',
              f: formula,
              v: cell.value !== null ? cell.value : 0,
            }
          } else {
            // Unknown formula type - use value
            worksheet[excelAddress] = {
              t: getCellType(cell.type),
              v: cell.value !== null ? cell.value : '',
            }
          }
        } else {
          // Regular cell value
          const excelCell: XLSX.CellObject = {
            t: getCellType(cell.type),
            v: cell.value !== null ? cell.value : '',
          }

          // Apply number format based on type
          if (cell.type === 'currency') {
            excelCell.z = '$#,##0.00'
          } else if (cell.type === 'percentage') {
            excelCell.z = '0.00%'
          } else if (cell.type === 'date') {
            excelCell.z = 'yyyy-mm-dd'
          }

          worksheet[excelAddress] = excelCell
        }
      })

      // Set column widths
      const colWidths = sheet.columns.map((col) => ({
        wch: col.width ? col.width / 8 : 12,
      }))
      worksheet['!cols'] = colWidths

      // Set range
      worksheet['!ref'] = XLSX.utils.encode_range(range)

      // Add sheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
    })

    // Generate and download the file
    XLSX.writeFile(workbook, filename)
  } catch (error) {
    console.error('Excel export error:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to export to Excel',
    )
  }
}

/**
 * Convert CellType to Excel cell type
 */
function getCellType(type: CellType): XLSX.ExcelDataType {
  switch (type) {
    case 'number':
    case 'currency':
    case 'percentage':
      return 'n'
    case 'date':
      return 'd'
    case 'formula':
      return 'n'
    default:
      return 's'
  }
}

/**
 * Export to CSV (simpler format)
 */
export function exportToCSV(
  data: ParsedSpreadsheetData,
  filename: string = 'spreadsheet.csv',
  sheetIndex: number = 0,
): void {
  try {
    const sheet = data.sheets[sheetIndex]
    if (!sheet) {
      throw new Error('Sheet not found')
    }

    const workbook = XLSX.utils.book_new()
    const worksheet: XLSX.WorkSheet = {}
    const range = {
      s: { c: 0, r: 0 },
      e: { c: sheet.columns.length - 1, r: 0 },
    }

    // Add headers
    sheet.columns.forEach((column, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex })
      worksheet[cellAddress] = { t: 's', v: column.header }
    })

    // Find max row and add data
    let maxRow = 0
    sheet.cells.forEach((cell, cellRef) => {
      const match = cellRef.match(/^([A-Z]+)(\d+)$/)
      if (!match) return

      const colId = match[1]
      const rowNum = parseInt(match[2])
      maxRow = Math.max(maxRow, rowNum)

      const colIndex = sheet.columns.findIndex((c) => c.id === colId)
      if (colIndex === -1) return

      const excelAddress = XLSX.utils.encode_cell({ r: rowNum, c: colIndex })
      worksheet[excelAddress] = {
        t: 's',
        v: cell.value !== null ? String(cell.value) : '',
      }
    })

    range.e.r = maxRow
    worksheet['!ref'] = XLSX.utils.encode_range(range)

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
    XLSX.writeFile(workbook, filename)
  } catch (error) {
    console.error('CSV export error:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to export to CSV',
    )
  }
}
