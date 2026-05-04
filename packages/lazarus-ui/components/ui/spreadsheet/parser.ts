import yaml from 'js-yaml'

import {
  CellOriginal,
  CellReference,
  CellType,
  ParsedSheetOriginal,
  ParsedSpreadsheetData,
} from './types'

export function parseSpreadsheetDocument(
  yamlContent: string,
): ParsedSpreadsheetData {
  try {
    const doc = yaml.load(yamlContent) as any

    if (!doc || !doc.spreadsheet) {
      throw new Error('Invalid spreadsheet document format')
    }

    const { meta = {}, sheets = [] } = doc.spreadsheet

    if (sheets.length === 0) {
      throw new Error('Spreadsheet must contain at least one sheet')
    }

    const parsedSheets: ParsedSheetOriginal[] = sheets.map((sheet: any) => {
      const cells = new Map<string, CellOriginal>()

      // Process data rows
      sheet.data?.forEach((row: any) => {
        Object.entries(row.cells).forEach(([columnId, value]) => {
          const cellRef = `${columnId}${row.row}`
          const column = sheet.columns.find((col: any) => col.id === columnId)

          cells.set(cellRef, {
            value: value as string | number | Date | null,
            type: detectCellType(value, column?.type),
            style: row.style || column?.style || 'default',
          })
        })
      })

      // Process formulas
      sheet.formulas?.forEach((formula: any) => {
        const existingCell = cells.get(formula.cell) || {
          value: null,
          type: 'formula',
        }
        cells.set(formula.cell, {
          ...existingCell,
          formula: formula.value,
          type: 'formula',
        })
      })

      return {
        name: sheet.name,
        columns: sheet.columns,
        cells,
        formatting: sheet.formatting || [],
        charts: sheet.charts || [],
        validation: sheet.validation || [],
        analysis: sheet.analysis || [],
      }
    })

    return {
      meta,
      sheets: parsedSheets,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse spreadsheet: ${error.message}`)
    }
    throw new Error('Failed to parse spreadsheet document')
  }
}

export function detectCellType(value: any, suggestedType?: CellType): CellType {
  if (suggestedType) {
    return suggestedType
  }

  if (value === null || value === undefined) {
    return 'text'
  }

  if (typeof value === 'string') {
    if (value.startsWith('=AI:')) {
      return 'formula'
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return 'date'
    }
    if (/^[$€£¥]/.test(value)) {
      return 'currency'
    }
    if (/^\d+\.?\d*%$/.test(value)) {
      return 'percentage'
    }
  }

  if (typeof value === 'number') {
    return 'number'
  }

  return 'text'
}

export function parseCellReference(ref: string): CellReference {
  const match = ref.match(/^(?:(.+)!)?([A-Z]+)(\d+)$/)

  if (!match) {
    throw new Error(`Invalid cell reference: ${ref}`)
  }

  const [, sheet, column, row] = match

  return {
    sheet,
    column,
    row: parseInt(row, 10),
  }
}

export function cellReferenceToString(ref: CellReference): string {
  const parts = []
  if (ref.sheet) {
    parts.push(`${ref.sheet}!`)
  }
  parts.push(`${ref.column}${ref.row}`)
  return parts.join('')
}

export function columnToIndex(column: string): number {
  let index = 0
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + (column.charCodeAt(i) - 65 + 1)
  }
  return index - 1
}

export function indexToColumn(index: number): string {
  let column = ''
  index += 1
  while (index > 0) {
    index -= 1
    column = String.fromCharCode(65 + (index % 26)) + column
    index = Math.floor(index / 26)
  }
  return column
}

export function stringifySpreadsheetDocument(doc: any): string {
  try {
    return yaml.dump(doc, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    })
  } catch (error) {
    console.error('Failed to stringify spreadsheet document:', error)
    return ''
  }
}
