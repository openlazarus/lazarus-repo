'use client'

import yaml from 'js-yaml'
import { useCallback, useEffect, useRef, useState } from 'react'

import { parseSpreadsheetDocument } from './parser'
import { SpreadsheetCanvas } from './spreadsheet-canvas'
import { ParsedSpreadsheetData } from './types'

interface SpreadsheetWrapperProps {
  content?: string
  onChange?: (content: string) => void
  lastModified?: Date
}

// Create default empty spreadsheet structure
const createDefaultSpreadsheet = () => {
  const defaultDoc = {
    spreadsheet: {
      meta: {
        title: 'New Spreadsheet',
        version: '1.0',
      },
      sheets: [
        {
          name: 'Sheet1',
          columns: [
            { id: 'A', header: 'Column A', type: 'text' },
            { id: 'B', header: 'Column B', type: 'text' },
            { id: 'C', header: 'Column C', type: 'text' },
          ],
          data: [],
        },
      ],
    },
  }
  return yaml.dump(defaultDoc, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  })
}

export function SpreadsheetWrapper({
  content,
  onChange,
  lastModified,
}: SpreadsheetWrapperProps) {
  const [parsedData, setParsedData] = useState<ParsedSpreadsheetData | null>(
    null,
  )
  const [internalContent, setInternalContent] = useState<string>(() => {
    // Initialize with content or default
    return content || createDefaultSpreadsheet()
  })
  const hasInitialized = useRef(false)

  // Update internal content when prop changes
  useEffect(() => {
    if (content && content !== internalContent) {
      setInternalContent(content)
    }
  }, [content])

  // Parse document on mount and when internal content changes
  useEffect(() => {
    try {
      const parsed = parseSpreadsheetDocument(internalContent)
      setParsedData(parsed)

      // Only update external content on first load if it was empty
      if (!hasInitialized.current && !content && onChange) {
        onChange(internalContent)
        hasInitialized.current = true
      }
    } catch (error) {
      console.error('Parse error:', error)
      // If parsing fails, create a valid default
      const defaultContent = createDefaultSpreadsheet()
      setInternalContent(defaultContent)

      try {
        const parsed = parseSpreadsheetDocument(defaultContent)
        setParsedData(parsed)

        // Update external content with valid default
        if (onChange) {
          onChange(defaultContent)
        }
      } catch (defaultError) {
        console.error('Failed to parse default:', defaultError)
      }
    }
  }, [internalContent])

  // Handle cell updates
  const handleCellUpdate = useCallback(
    (sheetName: string, cellRef: string, value: string) => {
      if (!onChange) return

      try {
        const doc = yaml.load(internalContent) as any
        const sheetIndex = doc.spreadsheet.sheets.findIndex(
          (s: any) => s.name === sheetName,
        )
        if (sheetIndex === -1) return

        const sheet = doc.spreadsheet.sheets[sheetIndex]

        // Extract column and row from cellRef (e.g., "A1" -> col: "A", row: 1)
        const match = cellRef.match(/^([A-Z]+)(\d+)$/)
        if (!match) return

        const columnId = match[1]
        const row = parseInt(match[2])

        // Initialize data array if it doesn't exist
        if (!sheet.data) sheet.data = []

        // Find or create the row
        let rowData = sheet.data.find((r: any) => r.row === row)
        if (!rowData) {
          rowData = { row, cells: {} }
          sheet.data.push(rowData)
        }

        // Update the cell value
        if (value === '') {
          delete rowData.cells[columnId]
        } else {
          rowData.cells[columnId] = value
        }

        // Clean up empty rows
        sheet.data = sheet.data.filter(
          (r: any) => Object.keys(r.cells).length > 0,
        )

        // Convert back to YAML and save
        const newYaml = yaml.dump(doc, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
        })
        onChange(newYaml)
      } catch (error) {
        console.error('Failed to update cell:', error)
      }
    },
    [internalContent, onChange],
  )

  // Handle sheet removal
  const handleRemoveSheet = useCallback(
    (index: number) => {
      if (!onChange) return

      try {
        const doc = yaml.load(internalContent) as any
        if (doc.spreadsheet.sheets.length > 1) {
          doc.spreadsheet.sheets.splice(index, 1)
          const newYaml = yaml.dump(doc, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false,
          })
          onChange(newYaml)
        }
      } catch (error) {
        console.error('Failed to remove sheet:', error)
      }
    },
    [internalContent, onChange],
  )

  // Handle column reordering
  const handleReorderColumns = useCallback(
    (sheetName: string, fromColumn: string, toColumn: string) => {
      if (!onChange) return

      try {
        const doc = yaml.load(internalContent) as any
        const sheet = doc.spreadsheet.sheets.find(
          (s: any) => s.name === sheetName,
        )
        if (!sheet) return

        const fromIndex = sheet.columns.findIndex(
          (c: any) => c.id === fromColumn,
        )
        const toIndex = sheet.columns.findIndex((c: any) => c.id === toColumn)

        if (fromIndex !== -1 && toIndex !== -1) {
          const [movedColumn] = sheet.columns.splice(fromIndex, 1)
          sheet.columns.splice(toIndex, 0, movedColumn)

          const newYaml = yaml.dump(doc, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false,
          })
          onChange(newYaml)
        }
      } catch (error) {
        console.error('Failed to reorder columns:', error)
      }
    },
    [internalContent, onChange],
  )

  // Handle row reordering
  const handleReorderRows = useCallback(
    (sheetName: string, fromRow: number, toRow: number) => {
      if (!onChange) return

      try {
        const doc = yaml.load(internalContent) as any
        const sheet = doc.spreadsheet.sheets.find(
          (s: any) => s.name === sheetName,
        )
        if (!sheet || !sheet.data) return

        // Swap row numbers in the data
        const fromRowData = sheet.data.find((r: any) => r.row === fromRow)
        const toRowData = sheet.data.find((r: any) => r.row === toRow)

        if (fromRowData) fromRowData.row = toRow
        if (toRowData) toRowData.row = fromRow

        const newYaml = yaml.dump(doc, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
        })
        onChange(newYaml)
      } catch (error) {
        console.error('Failed to reorder rows:', error)
      }
    },
    [internalContent, onChange],
  )

  // Handle column updates (header, type, format)
  const handleUpdateColumn = useCallback(
    (
      sheetName: string,
      columnId: string,
      updates: { header?: string; type?: string; format?: string },
    ) => {
      if (!onChange) return

      try {
        const doc = yaml.load(internalContent) as any
        const sheet = doc.spreadsheet.sheets.find(
          (s: any) => s.name === sheetName,
        )
        if (!sheet) return

        const column = sheet.columns.find((c: any) => c.id === columnId)
        if (!column) return

        if (updates.header !== undefined) column.header = updates.header
        if (updates.type !== undefined) column.type = updates.type
        if (updates.format !== undefined) column.format = updates.format

        const newYaml = yaml.dump(doc, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
        })
        onChange(newYaml)
      } catch (error) {
        console.error('Failed to update column:', error)
      }
    },
    [internalContent, onChange],
  )

  // Handle adding new column
  const handleAddColumn = useCallback(
    (
      sheetName: string,
      columnId: string,
      columnData: { header: string; type: string; width: number },
    ) => {
      if (!onChange) return

      try {
        const doc = yaml.load(internalContent) as any
        const sheet = doc.spreadsheet.sheets.find(
          (s: any) => s.name === sheetName,
        )
        if (!sheet) return

        // Add new column
        sheet.columns.push({
          id: columnId,
          header: columnData.header || `Column ${columnId}`,
          type: columnData.type,
          width: columnData.width,
        })

        const newYaml = yaml.dump(doc, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
        })
        onChange(newYaml)
      } catch (error) {
        console.error('Failed to add column:', error)
      }
    },
    [internalContent, onChange],
  )

  // Handle batch cell updates (for multiple cell operations)
  const handleBatchCellUpdate = useCallback(
    (sheetName: string, updates: Array<{ cellRef: string; value: string }>) => {
      if (!onChange) return

      try {
        const doc = yaml.load(internalContent) as any
        const sheet = doc.spreadsheet.sheets.find(
          (s: any) => s.name === sheetName,
        )
        if (!sheet) return

        // Initialize data array if it doesn't exist
        if (!sheet.data) sheet.data = []

        // Apply all updates
        updates.forEach(({ cellRef, value }) => {
          const match = cellRef.match(/^([A-Z]+)(\d+)$/)
          if (!match) return

          const columnId = match[1]
          const row = parseInt(match[2])

          // Find or create the row
          let rowData = sheet.data.find((r: any) => r.row === row)
          if (!rowData) {
            rowData = { row, cells: {} }
            sheet.data.push(rowData)
          }

          // Update the cell value
          if (value === '') {
            delete rowData.cells[columnId]
          } else {
            rowData.cells[columnId] = value
          }
        })

        // Clean up empty rows
        sheet.data = sheet.data.filter(
          (r: any) => Object.keys(r.cells).length > 0,
        )

        // Sort rows
        sheet.data.sort((a: any, b: any) => a.row - b.row)

        const newYaml = yaml.dump(doc, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
        })
        onChange(newYaml)
      } catch (error) {
        console.error('Failed to batch update cells:', error)
      }
    },
    [internalContent, onChange],
  )

  // Handle adding new sheet
  const handleAddSheet = useCallback(
    (template?: any) => {
      if (!onChange) return

      try {
        const doc = yaml.load(internalContent) as any

        let newSheet
        if (template && template.yaml) {
          // Parse the template YAML
          newSheet = yaml.load(template.yaml) as any
        } else {
          // Create a blank sheet
          newSheet = {
            name: `Sheet ${doc.spreadsheet.sheets.length + 1}`,
            columns: [
              { id: 'A', header: 'Column A', type: 'text', width: 100 },
              { id: 'B', header: 'Column B', type: 'text', width: 100 },
              { id: 'C', header: 'Column C', type: 'text', width: 100 },
            ],
            data: [],
          }
        }

        doc.spreadsheet.sheets.push(newSheet)

        const newYaml = yaml.dump(doc, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
        })
        onChange(newYaml)
      } catch (error) {
        console.error('Failed to add sheet:', error)
      }
    },
    [internalContent, onChange],
  )

  // Always show the canvas, even with errors - it will show its own empty state
  return (
    <SpreadsheetCanvas
      data={parsedData}
      onCellUpdate={handleCellUpdate}
      onBatchCellUpdate={handleBatchCellUpdate}
      onRemoveSheet={handleRemoveSheet}
      onAddSheet={handleAddSheet}
      onReorderColumns={handleReorderColumns}
      onReorderRows={handleReorderRows}
      onUpdateColumn={handleUpdateColumn}
      onAddColumn={handleAddColumn}
    />
  )
}
