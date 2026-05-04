'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Spinner from '../spinner'
import { FormattingRibbon, SelectionType } from './formatting-ribbon'
import { SheetTemplateModal } from './sheet-templates'
import './spreadsheet-animations.css'
import './spreadsheet-apple.css'
import {
  CellFormat,
  CellOriginal,
  CellStyle,
  ParsedSpreadsheetData,
} from './types'
import { useAIProcessing } from './use-ai-processing'
import { calculateSpreadsheetDiff } from './utils/diff-calculator'

import type { SheetTemplate } from './sheet-templates'
import type { CellDiff, ColumnDiff, RowDiff } from './types/diff'

interface SpreadsheetCanvasProps {
  data: ParsedSpreadsheetData | null
  onCellUpdate?: (sheetName: string, cellRef: string, value: string) => void
  onBatchCellUpdate?: (
    sheetName: string,
    updates: Array<{ cellRef: string; value: string }>,
  ) => void
  onRemoveSheet?: (index: number) => void
  onAddSheet?: (template?: SheetTemplate) => void
  onReorderColumns?: (
    sheetName: string,
    fromColumn: string,
    toColumn: string,
  ) => void
  onReorderRows?: (sheetName: string, fromRow: number, toRow: number) => void
  onUpdateColumn?: (
    sheetName: string,
    columnId: string,
    updates: { header?: string; type?: string; format?: string },
  ) => void
  onAddColumn?: (
    sheetName: string,
    columnId: string,
    columnData: { header: string; type: string; width: number },
  ) => void
  // Diff mode props
  diffMode?: boolean
  originalData?: ParsedSpreadsheetData | null
  showDiffLegend?: boolean
}

interface CellRange {
  start: { col: string; row: number }
  end: { col: string; row: number }
}

// History types
interface HistoryAction {
  type:
    | 'cellUpdate'
    | 'batchCellUpdate'
    | 'formatChange'
    | 'columnUpdate'
    | 'rowReorder'
    | 'columnReorder'
  timestamp: number
  data: any
  undo: () => void
  redo: () => void
}

export function SpreadsheetCanvas({
  data,
  onCellUpdate,
  onBatchCellUpdate,
  onRemoveSheet,
  onAddSheet,
  onReorderColumns,
  onReorderRows,
  onUpdateColumn,
  onAddColumn,
  diffMode = false,
  originalData = null,
  showDiffLegend = true,
}: SpreadsheetCanvasProps) {
  const [activeSheet, setActiveSheet] = useState(0)
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null)
  const [selectionAnchor, setSelectionAnchor] = useState<{
    col: string
    row: number
  } | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editingRange, setEditingRange] = useState<CellRange | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<string | null>(null)
  const [copiedData, setCopiedData] = useState<Map<string, string> | null>(null)
  const [copiedRange, setCopiedRange] = useState<CellRange | null>(null)
  const [isFillDragging, setIsFillDragging] = useState(false)
  const [fillPreviewRange, setFillPreviewRange] = useState<CellRange | null>(
    null,
  )
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [draggedRow, setDraggedRow] = useState<number | null>(null)
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null)
  const [dropTargetRow, setDropTargetRow] = useState<number | null>(null)
  const [editingColumnHeader, setEditingColumnHeader] = useState<string | null>(
    null,
  )
  const [editColumnValue, setEditColumnValue] = useState('')
  const [showColumnTypeMenu, setShowColumnTypeMenu] = useState<string | null>(
    null,
  )
  const [showCurrencyMenu, setShowCurrencyMenu] = useState<string | null>(null)
  const [customCurrencyInput, setCustomCurrencyInput] = useState('')
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const [_aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [_showCellTagging, setShowCellTagging] = useState(false)
  const [animatingCells, setAnimatingCells] = useState<Set<string>>(new Set())
  const [columnAnimations, setColumnAnimations] = useState<Map<string, string>>(
    new Map(),
  )
  const [rowAnimations, setRowAnimations] = useState<Map<number, string>>(
    new Map(),
  )
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [columnSelectionAnchor, setColumnSelectionAnchor] = useState<
    string | null
  >(null)
  const [rowSelectionAnchor, setRowSelectionAnchor] = useState<number | null>(
    null,
  )
  const [cellColors, setCellColors] = useState<Map<string, string>>(new Map())
  const [columnColors, setColumnColors] = useState<Map<string, string>>(
    new Map(),
  )
  const [rowColors, setRowColors] = useState<Map<number, string>>(new Map())
  const gridRef = useRef<HTMLDivElement>(null)

  // New formatting states
  const [showFormattingRibbon, setShowFormattingRibbon] = useState(false)
  const [ribbonPosition, setRibbonPosition] = useState<{
    x: number
    y: number
  }>({ x: 0, y: 0 })
  const [cellFormats, setCellFormats] = useState<Map<string, CellFormat>>(
    new Map(),
  )

  // History state for undo/redo
  const [history, setHistory] = useState<HistoryAction[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const maxHistorySize = 100

  // Template modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  // Sheet editing state
  const [editingSheetIndex, setEditingSheetIndex] = useState<number | null>(
    null,
  )
  const [editSheetName, setEditSheetName] = useState('')

  // AI Processing Hook
  const {
    isProcessing: aiIsProcessing,
    processingCells,
    processAIFormula,
    isCellProcessing,
    error: aiError,
    clearError: clearAIError,
  } = useAIProcessing()
  const fillHandleRef = useRef<HTMLDivElement>(null)

  // Calculate diff when in diff mode
  const diff = useMemo(() => {
    if (!diffMode || !originalData || !data) return null

    // Convert ParsedSpreadsheetData to SpreadsheetData format for diff calculation
    const convertToSpreadsheetData = (parsed: ParsedSpreadsheetData) => ({
      meta: parsed.meta,
      sheets: parsed.sheets.map((sheet) => ({
        name: sheet.name,
        columns: sheet.columns,
        cells: sheet.cells,
      })),
    })

    return calculateSpreadsheetDiff(
      convertToSpreadsheetData(originalData),
      convertToSpreadsheetData(data),
    )
  }, [diffMode, originalData, data])

  // Helper to get cell diff
  const getCellDiff = useCallback(
    (sheetName: string, cellRef: string): CellDiff | null => {
      if (!diff) return null
      const sheetDiff = diff.sheets.get(sheetName)
      return sheetDiff?.cellDiffs.get(cellRef) || null
    },
    [diff],
  )

  // Helper to get column diff
  const getColumnDiff = useCallback(
    (sheetName: string, columnId: string): ColumnDiff | null => {
      if (!diff) return null
      const sheetDiff = diff.sheets.get(sheetName)
      return sheetDiff?.columnDiffs.get(columnId) || null
    },
    [diff],
  )

  // Helper to get row diff
  const getRowDiff = useCallback(
    (sheetName: string, rowIndex: number): RowDiff | null => {
      if (!diff) return null
      const sheetDiff = diff.sheets.get(sheetName)
      return sheetDiff?.rowDiffs.get(rowIndex) || null
    },
    [diff],
  )

  // Helper to format diff values for display
  const formatDiffValue = (
    value: string | number | Date | undefined,
  ): string => {
    if (value === undefined || value === null) return ''
    if (value instanceof Date) {
      return value.toLocaleDateString()
    }
    return String(value)
  }

  // Add to history
  const addToHistory = useCallback(
    (action: HistoryAction) => {
      setHistory((prev) => {
        // Remove any actions after current index
        const newHistory = prev.slice(0, historyIndex + 1)
        // Add new action
        newHistory.push(action)
        // Limit history size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift()
        }
        return newHistory
      })
      setHistoryIndex((prev) => Math.min(prev + 1, maxHistorySize - 1))
    },
    [historyIndex],
  )

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex >= 0 && history[historyIndex]) {
      history[historyIndex].undo()
      setHistoryIndex((prev) => prev - 1)
    }
  }, [history, historyIndex])

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
      history[historyIndex + 1].redo()
      setHistoryIndex((prev) => prev + 1)
    }
  }, [history, historyIndex])

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (template: SheetTemplate) => {
      // Call onAddSheet with the template data
      if (onAddSheet) {
        onAddSheet(template)
      }
    },
    [onAddSheet],
  )

  // Animate cell updates
  const animateCellUpdate = useCallback((cellRefs: string[]) => {
    setAnimatingCells((prev) => {
      const newSet = new Set(prev)
      cellRefs.forEach((ref) => newSet.add(ref))
      return newSet
    })

    // Remove animation class after animation completes
    setTimeout(() => {
      setAnimatingCells((prev) => {
        const newSet = new Set(prev)
        cellRefs.forEach((ref) => newSet.delete(ref))
        return newSet
      })
    }, 500)
  }, [])

  // Move all hooks here before any conditional logic
  const handleMouseUp = () => {
    if (isFillDragging && fillPreviewRange && selectedRange) {
      // Apply auto-fill
      autoFill(selectedRange, fillPreviewRange)
    }

    setIsDragging(false)
    setDragStart(null)
    setIsFillDragging(false)
    setFillPreviewRange(null)
  }

  useEffect(() => {
    if (data && data.sheets.length > 0) {
      document.addEventListener('mouseup', handleMouseUp)
      return () => document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isFillDragging, fillPreviewRange, selectedRange, data])

  // Close menus when clicking outside
  useEffect(() => {
    if (data && data.sheets.length > 0) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (showColumnTypeMenu && !target.closest('.column-type-menu')) {
          setShowColumnTypeMenu(null)
        }
        if (showCurrencyMenu && !target.closest('.currency-menu')) {
          setShowCurrencyMenu(null)
          setCustomCurrencyInput('')
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColumnTypeMenu, showCurrencyMenu, data])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!data || data.sheets.length === 0 || editingCell) return

      const currentSheet = data.sheets[activeSheet]
      const current = selectedCell ? parseCellRef(selectedCell) : null

      // Handle Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        redo()
        return
      }

      // Handle Escape to clear multi-selection
      if (e.key === 'Escape') {
        if (selectedColumns.size > 0 || selectedRows.size > 0) {
          setSelectedColumns(new Set())
          setSelectedRows(new Set())
          setColumnSelectionAnchor(null)
          setRowSelectionAnchor(null)
          e.preventDefault()
          return
        }
      }

      if (!current) return

      let newCell: string | null = null

      // Handle Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            // Copy
            if (selectedRange) {
              const cells = getCellsInRange(selectedRange)
              const copyData = new Map<string, string>()
              cells.forEach((cellRef) => {
                const cell = currentSheet.cells.get(cellRef)
                copyData.set(
                  cellRef,
                  cell?.formula || String(cell?.value || ''),
                )
              })
              setCopiedData(copyData)
              setCopiedRange(selectedRange)
            } else if (selectedCell) {
              const cell = currentSheet.cells.get(selectedCell)
              const copyData = new Map<string, string>()
              copyData.set(
                selectedCell,
                cell?.formula || String(cell?.value || ''),
              )
              setCopiedData(copyData)
              setCopiedRange(null)
            }
            e.preventDefault()
            return

          case 'v':
            // Paste
            if (copiedData && copiedData.size > 0 && selectedCell) {
              const updates: Array<{ cellRef: string; value: string }> = []

              if (copiedRange && selectedRange) {
                // Paste range to range
                const sourceStart = parseCellRef(
                  Array.from(copiedData.keys())[0],
                )
                const targetStart = selectedRange.start

                if (sourceStart) {
                  const rowOffset = targetStart.row - sourceStart.row
                  const colOffset =
                    columnToIndex(targetStart.col) -
                    columnToIndex(sourceStart.col)

                  copiedData.forEach((value, sourceCellRef) => {
                    const sourceCell = parseCellRef(sourceCellRef)
                    if (sourceCell) {
                      const targetRow = sourceCell.row + rowOffset
                      const targetColIndex =
                        columnToIndex(sourceCell.col) + colOffset
                      if (
                        targetColIndex >= 0 &&
                        targetColIndex < currentSheet.columns.length
                      ) {
                        const targetCol =
                          currentSheet.columns[targetColIndex].id
                        const targetCellRef = `${targetCol}${targetRow}`
                        updates.push({ cellRef: targetCellRef, value })
                      }
                    }
                  })
                }
              } else if (copiedData.size === 1) {
                // Paste single cell
                const value = Array.from(copiedData.values())[0]
                if (selectedRange) {
                  // Paste to all cells in selection
                  const cells = getCellsInRange(selectedRange)
                  cells.forEach((cellRef) => {
                    updates.push({ cellRef, value })
                  })
                } else {
                  // Paste to current cell
                  updates.push({ cellRef: selectedCell, value })
                }
              }

              if (updates.length > 0) {
                // Create history action
                const previousValues = new Map<string, string>()
                updates.forEach(({ cellRef }) => {
                  const cell = currentSheet.cells.get(cellRef)
                  previousValues.set(
                    cellRef,
                    cell?.formula || String(cell?.value || ''),
                  )
                })

                const action: HistoryAction = {
                  type: 'batchCellUpdate',
                  timestamp: Date.now(),
                  data: { updates, previousValues },
                  undo: () => {
                    const undoUpdates = Array.from(
                      previousValues.entries(),
                    ).map(([cellRef, value]) => ({
                      cellRef,
                      value,
                    }))
                    if (onBatchCellUpdate) {
                      onBatchCellUpdate(currentSheet.name, undoUpdates)
                    }
                  },
                  redo: () => {
                    if (onBatchCellUpdate) {
                      onBatchCellUpdate(currentSheet.name, updates)
                    }
                  },
                }

                addToHistory(action)

                if (onBatchCellUpdate) {
                  onBatchCellUpdate(currentSheet.name, updates)
                } else if (onCellUpdate) {
                  updates.forEach(({ cellRef, value }) => {
                    onCellUpdate(currentSheet.name, cellRef, value)
                  })
                }
              }
            }
            e.preventDefault()
            return

          case 'x':
            // Cut
            if (selectedRange) {
              const cells = getCellsInRange(selectedRange)
              const copyData = new Map<string, string>()
              cells.forEach((cellRef) => {
                const cell = currentSheet.cells.get(cellRef)
                copyData.set(
                  cellRef,
                  cell?.formula || String(cell?.value || ''),
                )
              })
              setCopiedData(copyData)
              setCopiedRange(selectedRange)

              // Animate cells before clearing
              animateCellUpdate(cells)

              // Use batch update for clearing cells
              if (onBatchCellUpdate) {
                const updates = cells.map((cellRef) => ({ cellRef, value: '' }))
                onBatchCellUpdate(currentSheet.name, updates)
              } else if (onCellUpdate) {
                // Fallback to individual updates
                cells.forEach((cellRef) => {
                  onCellUpdate(currentSheet.name, cellRef, '')
                })
              }
            } else if (selectedCell) {
              const cell = currentSheet.cells.get(selectedCell)
              const copyData = new Map<string, string>()
              copyData.set(
                selectedCell,
                cell?.formula || String(cell?.value || ''),
              )
              setCopiedData(copyData)
              setCopiedRange(null)

              // Animate single cell before clearing
              animateCellUpdate([selectedCell])
              onCellUpdate?.(currentSheet.name, selectedCell, '')
            }
            e.preventDefault()
            return

          case 'a':
            // Select all
            const start = { col: currentSheet.columns[0].id, row: 1 }
            const end = {
              col: currentSheet.columns[currentSheet.columns.length - 1].id,
              row: getMaxRow(),
            }
            setSelectedRange({ start, end })
            e.preventDefault()
            return

          case 'h':
            // Show formatting ribbon (Ctrl/Cmd+H)
            if (
              selectedCell ||
              selectedRange ||
              selectedColumns.size > 0 ||
              selectedRows.size > 0
            ) {
              const element =
                document.querySelector(`[data-cell="${selectedCell}"]`) ||
                document.querySelector('.ring-2.ring-[#0098FC]')
              if (element) {
                const rect = element.getBoundingClientRect()
                setRibbonPosition({
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                })
                setShowFormattingRibbon(true)
              }
            }
            e.preventDefault()
            return
        }
      }

      // Handle direct typing (letters, numbers, =)
      if (
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key.length === 1 &&
        (selectedCell || selectedRange)
      ) {
        // When a range is selected, edit applies to all cells in the range
        if (selectedRange) {
          // Starting multi-cell edit
          // Set editing mode with the first cell of the range for visual feedback
          setEditingCell(`${selectedRange.start.col}${selectedRange.start.row}`)
          setEditingRange(selectedRange) // Capture the range being edited
          setEditValue(e.key)
          // Keep the range selected so we know to apply to all cells
        } else if (selectedCell) {
          // Starting single-cell edit
          setEditingCell(selectedCell)
          setEditingRange(null)
          setEditValue(e.key)
        }

        // Show simple hint if user types =
        if (e.key === '=') {
          setShowCellTagging(true)
          setTimeout(() => {
            const hint = document.createElement('div')
            hint.className =
              'fixed z-50 bg-gray-800 text-white text-xs px-3 py-2 rounded shadow-lg pointer-events-none'
            hint.textContent = editingRange
              ? `Type "AI:" for AI formulas. This will apply to all ${getCellsInRange(editingRange).length} selected cells.`
              : 'Type "AI:" for AI formulas or reference cells like A1, B2:C5'
            hint.style.left = '50%'
            hint.style.top = '60px'
            hint.style.transform = 'translateX(-50%)'
            document.body.appendChild(hint)
            setTimeout(() => {
              hint.style.opacity = '0'
              hint.style.transition = 'opacity 0.3s'
              setTimeout(() => {
                if (document.body.contains(hint)) {
                  document.body.removeChild(hint)
                }
              }, 300)
            }, 3000)
          }, 100)
        }
        e.preventDefault()
        return
      }

      switch (e.key) {
        case 'ArrowUp':
          if (current.row > 1) {
            newCell = `${current.col}${current.row - 1}`
          }
          break
        case 'ArrowDown':
          newCell = `${current.col}${current.row + 1}`
          break
        case 'ArrowLeft':
          const colIndex = columnToIndex(current.col)
          if (colIndex > 0 && currentSheet.columns[colIndex - 1]) {
            newCell = `${currentSheet.columns[colIndex - 1].id}${current.row}`
          }
          break
        case 'ArrowRight':
          const rightIndex = columnToIndex(current.col)
          if (rightIndex < currentSheet.columns.length - 1) {
            newCell = `${currentSheet.columns[rightIndex + 1].id}${current.row}`
          }
          break
        case 'Tab':
          e.preventDefault()
          const tabIndex = columnToIndex(current.col)
          if (e.shiftKey) {
            // Tab backwards
            if (tabIndex > 0) {
              newCell = `${currentSheet.columns[tabIndex - 1].id}${current.row}`
            }
          } else {
            // Tab forwards
            if (tabIndex < currentSheet.columns.length - 1) {
              newCell = `${currentSheet.columns[tabIndex + 1].id}${current.row}`
            }
          }
          break
        case 'Enter':
          if (!e.shiftKey) {
            // Move down after enter
            newCell = `${current.col}${current.row + 1}`
          }
          break
        case 'F2':
          // Edit mode
          if (selectedRange) {
            // Edit the first cell of the range but keep range selected
            const firstCell = `${selectedRange.start.col}${selectedRange.start.row}`
            const cell = currentSheet.cells.get(firstCell)
            setEditingCell(firstCell)
            setEditingRange(selectedRange) // Capture the range being edited
            setEditValue(cell?.formula || String(cell?.value || ''))
          } else if (selectedCell) {
            const cell = currentSheet.cells.get(selectedCell)
            setEditingCell(selectedCell)
            setEditingRange(null)
            setEditValue(cell?.formula || String(cell?.value || ''))
          }
          e.preventDefault()
          break
        case 'Delete':
        case 'Backspace':
          if (selectedRange && onBatchCellUpdate) {
            // Delete all cells in range using batch update
            const cells = getCellsInRange(selectedRange)
            // Animate cells before deleting
            animateCellUpdate(cells)
            const updates = cells.map((cellRef) => ({ cellRef, value: '' }))
            onBatchCellUpdate(currentSheet.name, updates)
          } else if (selectedRange && onCellUpdate) {
            // Fallback to individual updates if batch not available
            const cells = getCellsInRange(selectedRange)
            // Animate cells before deleting
            animateCellUpdate(cells)
            cells.forEach((cellRef) => {
              onCellUpdate(currentSheet.name, cellRef, '')
            })
          } else if (selectedCell && onCellUpdate) {
            // Delete single cell
            // Animate single cell before deleting
            animateCellUpdate([selectedCell])
            onCellUpdate(currentSheet.name, selectedCell, '')
          }
          e.preventDefault()
          break
      }

      if (newCell) {
        if (e.shiftKey && e.key.startsWith('Arrow')) {
          // Extend selection using anchor cell
          let anchor = selectionAnchor

          // If no anchor exists, use the current selected cell or range start
          if (!anchor) {
            if (selectedCell) {
              anchor = parseCellRef(selectedCell)
            } else if (selectedRange) {
              anchor = selectedRange.start
            } else {
              anchor = current
            }
            setSelectionAnchor(anchor)
          }

          const end = parseCellRef(newCell)
          if (anchor && end) {
            setSelectedRange({ start: anchor, end })
            setSelectedCell(null) // Clear single cell selection when we have a range
          }
        } else {
          // Move selection (clear range and anchor)
          setSelectedCell(newCell)
          setSelectedRange(null)
          setSelectionAnchor(null)
        }
      }
    },
    [
      selectedCell,
      selectedRange,
      editingCell,
      editingRange,
      data,
      activeSheet,
      onCellUpdate,
      onBatchCellUpdate,
      copiedData,
      copiedRange,
      selectedColumns,
      selectedRows,
      addToHistory,
      undo,
      redo,
    ],
  )

  useEffect(() => {
    if (data && data.sheets.length > 0) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, data])

  // Get current selection type for formatting ribbon
  const getSelectionType = useCallback((): SelectionType => {
    if (selectedColumns.size > 0) return 'column'
    if (selectedRows.size > 0) return 'row'
    if (selectedRange) return 'range'
    if (selectedCell) return 'cell'
    return 'cell'
  }, [selectedColumns, selectedRows, selectedRange, selectedCell])

  // Get count of selected items
  const getSelectedCount = useCallback((): number => {
    if (selectedColumns.size > 0) return selectedColumns.size
    if (selectedRows.size > 0) return selectedRows.size
    if (selectedRange) {
      // Define getCellsInRange inline to avoid dependency issues
      const getCellsInRangeLocal = (range: CellRange): string[] => {
        if (!data || data.sheets.length === 0) return []

        const currentSheet = data.sheets[activeSheet]
        const cells: string[] = []

        // Find actual positions of columns in the current visual order
        const startColVisualIndex = currentSheet.columns.findIndex(
          (c) => c.id === range.start.col,
        )
        const endColVisualIndex = currentSheet.columns.findIndex(
          (c) => c.id === range.end.col,
        )

        // If columns not found, fall back to original logic
        if (startColVisualIndex === -1 || endColVisualIndex === -1) {
          // Fallback to original alphabetical logic
          const columnToIndexLocal = (col: string): number => {
            let index = 0
            for (let i = 0; i < col.length; i++) {
              index = index * 26 + (col.charCodeAt(i) - 65 + 1)
            }
            return index - 1
          }

          const startCol = columnToIndexLocal(range.start.col)
          const endCol = columnToIndexLocal(range.end.col)
          const minCol = Math.min(startCol, endCol)
          const maxCol = Math.max(startCol, endCol)
          const minRow = Math.min(range.start.row, range.end.row)
          const maxRow = Math.max(range.start.row, range.end.row)

          for (let row = minRow; row <= maxRow; row++) {
            for (let colIndex = minCol; colIndex <= maxCol; colIndex++) {
              const col = currentSheet.columns[colIndex]
              if (col) {
                cells.push(`${col.id}${row}`)
              }
            }
          }
          return cells
        }

        // Use visual order for iteration
        const minColVisual = Math.min(startColVisualIndex, endColVisualIndex)
        const maxColVisual = Math.max(startColVisualIndex, endColVisualIndex)
        const minRow = Math.min(range.start.row, range.end.row)
        const maxRow = Math.max(range.start.row, range.end.row)

        for (let row = minRow; row <= maxRow; row++) {
          for (
            let visualIndex = minColVisual;
            visualIndex <= maxColVisual;
            visualIndex++
          ) {
            const col = currentSheet.columns[visualIndex]
            if (col) {
              cells.push(`${col.id}${row}`)
            }
          }
        }
        return cells
      }

      return getCellsInRangeLocal(selectedRange).length
    }
    if (selectedCell) return 1
    return 0
  }, [
    selectedColumns,
    selectedRows,
    selectedRange,
    selectedCell,
    data,
    activeSheet,
  ])

  // Get current format of selection
  const getCurrentFormat = useCallback((): CellFormat => {
    if (!data || data.sheets.length === 0) return {}

    const currentSheet = data.sheets[activeSheet]
    if (!currentSheet) return {}

    let format: CellFormat = {}

    if (selectedCell) {
      format = cellFormats.get(selectedCell) || {}
      // Include wrap mode from cellFormats
      format = {
        ...format,
        wrapMode: format?.wrapMode || 'nowrap',
      }
    } else if (selectedRange) {
      // For ranges, get format from first cell (could be enhanced to show mixed state)
      const firstCell = `${selectedRange.start.col}${selectedRange.start.row}`
      format = cellFormats.get(firstCell) || {}
      format = {
        ...format,
        wrapMode: format?.wrapMode || 'nowrap',
      }
    }

    return format
  }, [data, activeSheet, selectedCell, selectedRange, cellFormats])

  // Handle format changes from ribbon
  const handleFormatChange = useCallback(
    (format: CellFormat) => {
      if (!data || data.sheets.length === 0) return
      const currentSheet = data.sheets[activeSheet]
      if (!currentSheet) return

      // Store previous state for history
      const previousCellFormats = new Map(cellFormats)
      const previousCellColors = new Map(cellColors)
      const previousColumnColors = new Map(columnColors)
      const previousRowColors = new Map(rowColors)

      // Define getCellsInRange inline to avoid dependency issues
      const getCellsInRangeLocal = (range: CellRange): string[] => {
        const cells: string[] = []

        // Find actual positions of columns in the current visual order
        const startColVisualIndex = currentSheet.columns.findIndex(
          (c) => c.id === range.start.col,
        )
        const endColVisualIndex = currentSheet.columns.findIndex(
          (c) => c.id === range.end.col,
        )

        // If columns not found, fall back to original logic
        if (startColVisualIndex === -1 || endColVisualIndex === -1) {
          // Fallback to original alphabetical logic
          const columnToIndexLocal = (col: string): number => {
            let index = 0
            for (let i = 0; i < col.length; i++) {
              index = index * 26 + (col.charCodeAt(i) - 65 + 1)
            }
            return index - 1
          }

          const startCol = columnToIndexLocal(range.start.col)
          const endCol = columnToIndexLocal(range.end.col)
          const minCol = Math.min(startCol, endCol)
          const maxCol = Math.max(startCol, endCol)
          const minRow = Math.min(range.start.row, range.end.row)
          const maxRow = Math.max(range.start.row, range.end.row)

          for (let row = minRow; row <= maxRow; row++) {
            for (let colIndex = minCol; colIndex <= maxCol; colIndex++) {
              const col = currentSheet.columns[colIndex]
              if (col) {
                cells.push(`${col.id}${row}`)
              }
            }
          }
          return cells
        }

        // Use visual order for iteration
        const minColVisual = Math.min(startColVisualIndex, endColVisualIndex)
        const maxColVisual = Math.max(startColVisualIndex, endColVisualIndex)
        const minRow = Math.min(range.start.row, range.end.row)
        const maxRow = Math.max(range.start.row, range.end.row)

        for (let row = minRow; row <= maxRow; row++) {
          for (
            let visualIndex = minColVisual;
            visualIndex <= maxColVisual;
            visualIndex++
          ) {
            const col = currentSheet.columns[visualIndex]
            if (col) {
              cells.push(`${col.id}${row}`)
            }
          }
        }
        return cells
      }

      // Handle clear format request
      if (format.clearFormat) {
        // Clear all formatting for cells
        if (selectedRange) {
          const cells = getCellsInRangeLocal(selectedRange)
          cells.forEach((cellRef) => {
            // Clear all formatting for the cell
            setCellFormats((prev) => {
              const newMap = new Map(prev)
              newMap.delete(cellRef)
              return newMap
            })
            // Clear cell-specific colors
            setCellColors((prev) => {
              const newMap = new Map(prev)
              newMap.delete(cellRef)
              return newMap
            })
          })
        } else if (selectedCell) {
          setCellFormats((prev) => {
            const newMap = new Map(prev)
            newMap.delete(selectedCell)
            return newMap
          })
          setCellColors((prev) => {
            const newMap = new Map(prev)
            newMap.delete(selectedCell)
            return newMap
          })
        }

        // Clear column colors if columns are selected
        if (selectedColumns.size > 0) {
          setColumnColors((prev) => {
            const newMap = new Map(prev)
            selectedColumns.forEach((colId) => {
              newMap.delete(colId)
            })
            return newMap
          })
        }

        // Clear row colors if rows are selected
        if (selectedRows.size > 0) {
          setRowColors((prev) => {
            const newMap = new Map(prev)
            selectedRows.forEach((rowNum) => {
              newMap.delete(rowNum)
            })
            return newMap
          })
        }

        return // Exit early for clear format
      }

      // Handle background color changes
      if (format.backgroundColor !== undefined) {
        if (selectedColumns.size > 0) {
          setColumnColors((prev) => {
            const newMap = new Map(prev)
            selectedColumns.forEach((colId) => {
              if (format.backgroundColor) {
                newMap.set(colId, format.backgroundColor)
              } else {
                newMap.delete(colId)
              }
            })
            return newMap
          })
        } else if (selectedRows.size > 0) {
          setRowColors((prev) => {
            const newMap = new Map(prev)
            selectedRows.forEach((rowNum) => {
              if (format.backgroundColor) {
                newMap.set(rowNum, format.backgroundColor)
              } else {
                newMap.delete(rowNum)
              }
            })
            return newMap
          })
        } else if (selectedRange) {
          const cells = getCellsInRangeLocal(selectedRange)
          setCellColors((prev) => {
            const newMap = new Map(prev)
            cells.forEach((cellRef) => {
              if (format.backgroundColor) {
                newMap.set(cellRef, format.backgroundColor)
              } else {
                newMap.delete(cellRef)
              }
            })
            return newMap
          })
        } else if (selectedCell) {
          setCellColors((prev) => {
            const newMap = new Map(prev)
            if (format.backgroundColor) {
              newMap.set(selectedCell, format.backgroundColor)
            } else {
              newMap.delete(selectedCell)
            }
            return newMap
          })
        }
      }

      // Handle other format changes (bold, italic, alignment, etc.)
      if (selectedRange) {
        const cells = getCellsInRangeLocal(selectedRange)
        cells.forEach((cellRef) => {
          setCellFormats((prev) => {
            const newMap = new Map(prev)
            const existingFormat = newMap.get(cellRef) || {}
            newMap.set(cellRef, { ...existingFormat, ...format })
            return newMap
          })
        })
      } else if (selectedCell) {
        setCellFormats((prev) => {
          const newMap = new Map(prev)
          const existingFormat = newMap.get(selectedCell) || {}
          newMap.set(selectedCell, { ...existingFormat, ...format })
          return newMap
        })
      }

      // Animate the formatted cells
      const cellsToAnimate = selectedRange
        ? getCellsInRangeLocal(selectedRange)
        : selectedCell
          ? [selectedCell]
          : []
      animateCellUpdate(cellsToAnimate)

      // Create history action if not clearing format
      if (!format.clearFormat) {
        const action: HistoryAction = {
          type: 'formatChange',
          timestamp: Date.now(),
          data: {
            format,
            selection: {
              selectedCell,
              selectedRange,
              selectedColumns: Array.from(selectedColumns),
              selectedRows: Array.from(selectedRows),
            },
          },
          undo: () => {
            // Restore previous state
            setCellFormats(previousCellFormats)
            setCellColors(previousCellColors)
            setColumnColors(previousColumnColors)
            setRowColors(previousRowColors)
            animateCellUpdate(cellsToAnimate)
          },
          redo: () => {
            // Reapply the format change
            handleFormatChange(format)
          },
        }

        addToHistory(action)
      }
    },
    [
      data,
      activeSheet,
      selectedCell,
      selectedRange,
      selectedColumns,
      selectedRows,
      animateCellUpdate,
      cellFormats,
      cellColors,
      columnColors,
      rowColors,
      addToHistory,
    ],
  )

  if (!data || data.sheets.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-gray-500'>
        No valid spreadsheet data to display
      </div>
    )
  }

  const currentSheet = data.sheets[activeSheet]

  const getMaxRow = (): number => {
    let maxRow = 0
    currentSheet.cells.forEach((_, cellRef) => {
      const match = cellRef.match(/[A-Z]+(\d+)/)
      if (match) {
        maxRow = Math.max(maxRow, parseInt(match[1]))
      }
    })
    return Math.max(maxRow, 20) // Minimum 20 rows
  }

  // Add new column function
  const addNewColumn = () => {
    if (!data) return

    const lastColumn = currentSheet.columns[currentSheet.columns.length - 1]
    const lastId = lastColumn?.id || 'A'

    // Generate next column ID (A -> B -> ... -> Z -> AA -> AB -> ...)
    let nextId = ''
    let carry = 1
    for (let i = lastId.length - 1; i >= 0; i--) {
      const charCode = lastId.charCodeAt(i) + carry
      if (charCode > 90) {
        // 'Z'
        nextId = 'A' + nextId
        carry = 1
      } else {
        nextId = String.fromCharCode(charCode) + nextId
        carry = 0
        break
      }
    }
    if (carry === 1) {
      nextId = 'A' + nextId
    }

    if (onAddColumn) {
      // Call the onAddColumn handler with the new column data
      onAddColumn(currentSheet.name, nextId, {
        header: '',
        type: 'text',
        width: 140,
      })
    } else {
      // Fallback alert if onAddColumn is not provided
    }
  }

  // Add new row function
  const addNewRow = () => {
    if (!data || !onCellUpdate) return

    const newRow = getMaxRow() + 1

    // Add an empty cell in the first column of the new row
    // This will effectively create a new row
    const firstColumn = currentSheet.columns[0]
    if (firstColumn) {
      onCellUpdate(currentSheet.name, `${firstColumn.id}${newRow}`, '')
    }
  }

  const parseCellRef = (
    cellRef: string,
  ): { col: string; row: number } | null => {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/)
    if (!match) return null
    return { col: match[1], row: parseInt(match[2]) }
  }

  const columnToIndex = (col: string): number => {
    let index = 0
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 65 + 1)
    }
    return index - 1
  }

  // Generate column label based on index (0 -> A, 1 -> B, etc.)
  const indexToColumnLabel = (index: number): string => {
    let label = ''
    let num = index
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label
      num = Math.floor(num / 26) - 1
    }
    return label
  }

  const isInRange = (cellRef: string, range: CellRange): boolean => {
    const cell = parseCellRef(cellRef)
    if (!cell) return false

    // Find actual positions of columns in the current visual order
    const startColVisualIndex = currentSheet.columns.findIndex(
      (c) => c.id === range.start.col,
    )
    const endColVisualIndex = currentSheet.columns.findIndex(
      (c) => c.id === range.end.col,
    )
    const cellColVisualIndex = currentSheet.columns.findIndex(
      (c) => c.id === cell.col,
    )

    // If any column is not found, fall back to the original logic
    if (
      startColVisualIndex === -1 ||
      endColVisualIndex === -1 ||
      cellColVisualIndex === -1
    ) {
      // Fallback to original alphabetical logic
      const startCol = columnToIndex(range.start.col)
      const endCol = columnToIndex(range.end.col)
      const cellCol = columnToIndex(cell.col)

      const minCol = Math.min(startCol, endCol)
      const maxCol = Math.max(startCol, endCol)
      const minRow = Math.min(range.start.row, range.end.row)
      const maxRow = Math.max(range.start.row, range.end.row)

      return (
        cellCol >= minCol &&
        cellCol <= maxCol &&
        cell.row >= minRow &&
        cell.row <= maxRow
      )
    }

    // Use visual indices for column comparison
    const minColVisual = Math.min(startColVisualIndex, endColVisualIndex)
    const maxColVisual = Math.max(startColVisualIndex, endColVisualIndex)
    const minRow = Math.min(range.start.row, range.end.row)
    const maxRow = Math.max(range.start.row, range.end.row)

    return (
      cellColVisualIndex >= minColVisual &&
      cellColVisualIndex <= maxColVisual &&
      cell.row >= minRow &&
      cell.row <= maxRow
    )
  }

  const getCellsInRange = (range: CellRange): string[] => {
    const cells: string[] = []

    // Find actual positions of columns in the current visual order
    const startColVisualIndex = currentSheet.columns.findIndex(
      (c) => c.id === range.start.col,
    )
    const endColVisualIndex = currentSheet.columns.findIndex(
      (c) => c.id === range.end.col,
    )

    // If columns not found, fall back to original logic
    if (startColVisualIndex === -1 || endColVisualIndex === -1) {
      // Fallback to original alphabetical logic
      const startCol = columnToIndex(range.start.col)
      const endCol = columnToIndex(range.end.col)
      const minCol = Math.min(startCol, endCol)
      const maxCol = Math.max(startCol, endCol)
      const minRow = Math.min(range.start.row, range.end.row)
      const maxRow = Math.max(range.start.row, range.end.row)

      for (let row = minRow; row <= maxRow; row++) {
        for (let colIndex = minCol; colIndex <= maxCol; colIndex++) {
          const col = currentSheet.columns[colIndex]
          if (col) {
            cells.push(`${col.id}${row}`)
          }
        }
      }
      return cells
    }

    // Use visual order for iteration
    const minColVisual = Math.min(startColVisualIndex, endColVisualIndex)
    const maxColVisual = Math.max(startColVisualIndex, endColVisualIndex)
    const minRow = Math.min(range.start.row, range.end.row)
    const maxRow = Math.max(range.start.row, range.end.row)

    for (let row = minRow; row <= maxRow; row++) {
      for (
        let visualIndex = minColVisual;
        visualIndex <= maxColVisual;
        visualIndex++
      ) {
        const col = currentSheet.columns[visualIndex]
        if (col) {
          cells.push(`${col.id}${row}`)
        }
      }
    }
    return cells
  }

  // Detect patterns for auto-fill
  const detectPattern = (
    values: string[],
  ): {
    type: 'number' | 'date' | 'text' | 'list'
    increment?: number
    pattern?: string[]
  } => {
    if (values.length === 0) return { type: 'text' }

    // Check if all are numbers
    const numbers = values.map((v) => parseFloat(v)).filter((n) => !isNaN(n))
    if (numbers.length === values.length && numbers.length > 1) {
      const increment = numbers[1] - numbers[0]
      const isArithmetic = numbers.every(
        (n, i) => i === 0 || Math.abs(n - numbers[0] - increment * i) < 0.0001,
      )
      if (isArithmetic) {
        return { type: 'number', increment }
      }
    }

    // Check for day patterns
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]
    const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    const shortMonths = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]

    for (const pattern of [days, shortDays, months, shortMonths]) {
      const indices = values.map((v) =>
        pattern.findIndex((p) => p.toLowerCase() === v.toLowerCase()),
      )
      if (indices.every((i) => i !== -1)) {
        return { type: 'list', pattern }
      }
    }

    return { type: 'text' }
  }

  const autoFill = (sourceRange: CellRange, targetRange: CellRange) => {
    const sourceCells = getCellsInRange(sourceRange)
    const sourceValues = sourceCells.map((cellRef) => {
      const cell = currentSheet.cells.get(cellRef)
      return String(cell?.value || '')
    })

    const pattern = detectPattern(sourceValues)
    const targetCells = getCellsInRange(targetRange)

    // Filter out source cells from target cells
    const newCells = targetCells.filter(
      (cellRef) => !sourceCells.includes(cellRef),
    )

    // Prepare batch updates
    const updates: Array<{ cellRef: string; value: string }> = []

    switch (pattern.type) {
      case 'number':
        if (pattern.increment && sourceValues.length > 0) {
          const startValue = parseFloat(sourceValues[0])
          newCells.forEach((cellRef, index) => {
            const value =
              startValue + pattern.increment! * (sourceCells.length + index)
            updates.push({ cellRef, value: String(value) })
          })
        }
        break

      case 'list':
        if (pattern.pattern && sourceValues.length > 0) {
          const startIndex = pattern.pattern.findIndex(
            (p) => p.toLowerCase() === sourceValues[0].toLowerCase(),
          )
          if (startIndex !== -1) {
            newCells.forEach((cellRef, index) => {
              const patternIndex =
                (startIndex + sourceCells.length + index) %
                pattern.pattern!.length
              updates.push({
                cellRef,
                value: pattern.pattern![patternIndex],
              })
            })
          }
        }
        break

      default:
        // Repeat the last value for text and other types
        if (sourceValues.length > 0) {
          const lastValue = sourceValues[sourceValues.length - 1]
          newCells.forEach((cellRef) => {
            updates.push({ cellRef, value: lastValue })
          })
        }
    }

    // Apply all updates at once
    if (updates.length > 0) {
      // Animate all the cells that will be filled
      const cellsToAnimate = updates.map((u) => u.cellRef)
      animateCellUpdate(cellsToAnimate)

      if (onBatchCellUpdate) {
        onBatchCellUpdate(currentSheet.name, updates)
      } else if (onCellUpdate) {
        // Fallback to individual updates
        updates.forEach(({ cellRef, value }) => {
          onCellUpdate(currentSheet.name, cellRef, value)
        })
      }
    }
  }

  const handleCellMouseDown = (cellRef: string, e: React.MouseEvent) => {
    if (e.shiftKey && selectedCell) {
      // Shift+click to select range
      const start = parseCellRef(selectedCell)
      const end = parseCellRef(cellRef)
      if (start && end) {
        setSelectedRange({ start, end })
        setSelectionAnchor(start) // Set anchor for future shift selections
      }
    } else {
      // Start new selection
      setSelectedCell(cellRef)
      setSelectedRange(null)
      setSelectionAnchor(null) // Reset anchor for new selection
      setDragStart(cellRef)
      setIsDragging(true)
    }

    // Show formatting ribbon on selection
    const rect = e.currentTarget.getBoundingClientRect()
    setRibbonPosition({ x: rect.left + rect.width / 2, y: rect.top })
    setShowFormattingRibbon(true)
  }

  const handleFillHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFillDragging(true)

    const sourceRange =
      selectedRange ||
      (selectedCell
        ? {
            start: parseCellRef(selectedCell)!,
            end: parseCellRef(selectedCell)!,
          }
        : null)

    if (sourceRange) {
      setFillPreviewRange(sourceRange)
    }
  }

  const handleCellMouseEnter = (cellRef: string) => {
    if (isDragging && dragStart && !isFillDragging) {
      const start = parseCellRef(dragStart)
      const end = parseCellRef(cellRef)
      if (start && end) {
        setSelectedRange({ start, end })
      }
    } else if (isFillDragging) {
      const sourceRange =
        selectedRange ||
        (selectedCell
          ? {
              start: parseCellRef(selectedCell)!,
              end: parseCellRef(selectedCell)!,
            }
          : null)

      if (sourceRange) {
        const end = parseCellRef(cellRef)
        if (end) {
          // Extend the fill preview range
          const newRange = {
            start: sourceRange.start,
            end: end,
          }
          setFillPreviewRange(newRange)
        }
      }
    }
  }

  const handleCellDoubleClick = (cellRef: string) => {
    const cell = currentSheet.cells.get(cellRef)
    setEditingCell(cellRef)
    setEditValue(cell?.formula || String(cell?.value || ''))
    // If we're editing a cell within the selected range, keep the range for multi-edit
    if (selectedRange && isInRange(cellRef, selectedRange)) {
      setEditingRange(selectedRange)
    } else {
      setEditingRange(null)
      setSelectedRange(null)
    }
  }

  const handleEditComplete = async () => {
    if (editingCell && (onCellUpdate || onBatchCellUpdate)) {
      // handleEditComplete called

      const currentSheet = data?.sheets[activeSheet]
      if (!currentSheet) return

      // Check if it's an AI formula
      if (editValue.startsWith('=AI:')) {
        // AI Formula detected

        if (editingRange && onBatchCellUpdate) {
          // Apply to all cells in range using batch update
          const cells = getCellsInRange(editingRange)
          // Applying AI formula to cells

          // Store previous values for history
          const previousValues = new Map<string, string>()
          cells.forEach((cellRef) => {
            const cell = currentSheet.cells.get(cellRef)
            previousValues.set(
              cellRef,
              cell?.formula || String(cell?.value || ''),
            )
          })

          const updates = cells.map((cellRef) => ({
            cellRef,
            value: editValue,
          }))

          // Create history action
          const action: HistoryAction = {
            type: 'batchCellUpdate',
            timestamp: Date.now(),
            data: { updates, previousValues },
            undo: () => {
              const undoUpdates = Array.from(previousValues.entries()).map(
                ([cellRef, value]) => ({
                  cellRef,
                  value,
                }),
              )
              onBatchCellUpdate(currentSheet.name, undoUpdates)
            },
            redo: () => {
              onBatchCellUpdate(currentSheet.name, updates)
            },
          }

          addToHistory(action)
          onBatchCellUpdate(currentSheet.name, updates)

          // Process AI formulas
          cells.forEach(async (cellRef) => {
            const result = await processAIFormula(
              cellRef,
              editValue,
              currentSheet,
            )
            if (result.success && result.result !== undefined) {
              onCellUpdate?.(currentSheet.name, cellRef, String(result.result))
            }
          })
        } else if (onCellUpdate) {
          // Store previous value for history
          const previousCell = currentSheet.cells.get(editingCell)
          const previousValue =
            previousCell?.formula || String(previousCell?.value || '')

          // Create history action
          const action: HistoryAction = {
            type: 'cellUpdate',
            timestamp: Date.now(),
            data: { cellRef: editingCell, value: editValue, previousValue },
            undo: () => {
              onCellUpdate(currentSheet.name, editingCell, previousValue)
            },
            redo: () => {
              onCellUpdate(currentSheet.name, editingCell, editValue)
            },
          }

          addToHistory(action)

          // Apply to single cell
          onCellUpdate(currentSheet.name, editingCell, editValue)
          // Process AI formula
          const result = await processAIFormula(
            editingCell,
            editValue,
            currentSheet,
          )
          if (result.success && result.result !== undefined) {
            onCellUpdate(currentSheet.name, editingCell, String(result.result))
          }
        }
      } else {
        // Regular cell update
        if (editingRange && onBatchCellUpdate) {
          // Apply to all cells in range using batch update
          const cells = getCellsInRange(editingRange)
          // Applying regular update to cells

          // Store previous values for history
          const previousValues = new Map<string, string>()
          cells.forEach((cellRef) => {
            const cell = currentSheet.cells.get(cellRef)
            previousValues.set(
              cellRef,
              cell?.formula || String(cell?.value || ''),
            )
          })

          const updates = cells.map((cellRef) => ({
            cellRef,
            value: editValue,
          }))

          // Create history action
          const action: HistoryAction = {
            type: 'batchCellUpdate',
            timestamp: Date.now(),
            data: { updates, previousValues },
            undo: () => {
              const undoUpdates = Array.from(previousValues.entries()).map(
                ([cellRef, value]) => ({
                  cellRef,
                  value,
                }),
              )
              onBatchCellUpdate(currentSheet.name, undoUpdates)
              animateCellUpdate(cells)
            },
            redo: () => {
              onBatchCellUpdate(currentSheet.name, updates)
              animateCellUpdate(cells)
            },
          }

          addToHistory(action)
          onBatchCellUpdate(currentSheet.name, updates)
          // Animate the updated cells
          animateCellUpdate(cells)
        } else if (onCellUpdate) {
          // Store previous value for history
          const previousCell = currentSheet.cells.get(editingCell)
          const previousValue =
            previousCell?.formula || String(previousCell?.value || '')

          // Create history action
          const action: HistoryAction = {
            type: 'cellUpdate',
            timestamp: Date.now(),
            data: { cellRef: editingCell, value: editValue, previousValue },
            undo: () => {
              onCellUpdate(currentSheet.name, editingCell, previousValue)
              animateCellUpdate([editingCell])
            },
            redo: () => {
              onCellUpdate(currentSheet.name, editingCell, editValue)
              animateCellUpdate([editingCell])
            },
          }

          addToHistory(action)

          // Apply to single cell
          // Applying to single cell
          onCellUpdate(currentSheet.name, editingCell, editValue)
          // Animate the single cell
          animateCellUpdate([editingCell])
        }
      }
    }
    setEditingCell(null)
    setEditingRange(null)
    setEditValue('')
    setShowAIAssistant(false)
  }

  const aiPromptExamples = [
    {
      category: 'Math & Calculations',
      prompts: [
        'sum of all values in column B',
        'average of cells B2 to B10',
        'multiply B2 by C2',
        'calculate 15% tax on B5',
        'compound interest on $1000 at 5% for 3 years',
      ],
    },
    {
      category: 'Data Analysis',
      prompts: [
        'find the highest value in column C',
        'count cells with values over 100',
        'what percentage of total is this cell',
        'standard deviation of column D',
        'trend analysis of last 6 months',
      ],
    },
    {
      category: 'Text & Formatting',
      prompts: [
        'combine first name and last name',
        'extract email domain',
        'convert to uppercase',
        'format as phone number',
        'clean and standardize this data',
      ],
    },
    {
      category: 'Date & Time',
      prompts: [
        'days between two dates',
        'add 30 days to this date',
        'current date and time',
        'calculate age from birthdate',
        'next business day',
      ],
    },
    {
      category: 'Business Logic',
      prompts: [
        'if revenue > 10000 then "High" else "Low"',
        'calculate commission based on sales tiers',
        'determine credit risk score',
        'forecast next quarter based on trend',
        'categorize expenses by amount',
      ],
    },
  ]

  const handleAIFormulaStart = () => {
    setShowAIAssistant(true)
    setAiPrompt('')

    // Generate contextual suggestions based on current data
    const suggestions = [
      'sum all values above',
      'average of this column',
      'compare to previous row',
      'calculate percentage change',
    ]
    setAiSuggestions(suggestions)
  }

  const handleAIFormulaSubmit = async () => {
    if (!aiPrompt.trim() || !editingCell) return

    setAiProcessing(true)

    // Simulate AI processing (in real implementation, this would call the AI service)
    setTimeout(() => {
      // Update the cell with the AI formula
      const formula = `=AI: ${aiPrompt}`
      setEditValue(formula)

      // Close AI assistant
      setShowAIAssistant(false)
      setAiProcessing(false)
      setAiPrompt('')

      // Submit the formula
      handleEditComplete()
    }, 1500)
  }

  const getColumnTypeIcon = (type?: string, format?: string) => {
    switch (type) {
      case 'currency':
        // Show actual currency symbol if available
        if (format) {
          const currency = currencies.find((c) => c.code === format)
          if (currency) {
            return (
              <span className='text-sm font-medium'>{currency.symbol}</span>
            )
          }
        }
        return <span className='text-sm font-medium'>$</span>
      case 'percentage':
        return (
          <svg
            className='h-3 w-3'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M7 7l10 10M7 17h.01M17 7h.01'
            />
          </svg>
        )
      case 'date':
        return (
          <svg
            className='h-3 w-3'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
            />
          </svg>
        )
      case 'number':
        return (
          <svg
            className='h-3 w-3'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M7 20l4-16m2 16l4-16M6 9h14M4 15h14'
            />
          </svg>
        )
      default:
        return (
          <svg
            className='h-3 w-3'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            />
          </svg>
        )
    }
  }

  const moveColumnLeft = (columnId: string) => {
    const currentIndex = currentSheet.columns.findIndex(
      (col) => col.id === columnId,
    )
    if (currentIndex > 0) {
      // Clear selection to prevent visual bugs
      setSelectedCell(null)
      setSelectedRange(null)
      setSelectionAnchor(null)

      if (selectedColumns.size > 1 && selectedColumns.has(columnId)) {
        // Move all selected columns as a group
        const selectedIndices = Array.from(selectedColumns)
          .map((id) => ({
            id,
            index: currentSheet.columns.findIndex((col) => col.id === id),
          }))
          .filter((item) => item.index !== -1)
          .sort((a, b) => a.index - b.index)

        // Find the leftmost selected column
        const leftmostIndex = selectedIndices[0].index

        // Can only move if there's space to the left
        if (leftmostIndex > 0) {
          const targetIndex = leftmostIndex - 1
          const targetColumnId = currentSheet.columns[targetIndex].id

          // Animate all selected columns
          selectedColumns.forEach((colId) => {
            setColumnAnimations((prev) => {
              const newMap = new Map(prev)
              newMap.set(colId, 'column-slide-left')
              return newMap
            })
          })

          // Clear animations after they complete
          setTimeout(() => {
            setColumnAnimations((prev) => {
              const newMap = new Map(prev)
              selectedColumns.forEach((colId) => newMap.delete(colId))
              return newMap
            })
          }, 300)

          // To move a group, we need to:
          // 1. Move all selected columns to be after the target position
          // 2. Do this in the correct order to maintain their relative positions

          // Since onReorderColumns seems to move a column before another column,
          // we need to move the rightmost selected column first, then the next, etc.
          // This preserves their relative order

          const reversedSelected = [...selectedIndices].reverse()

          // Move each selected column to be after the target column
          reversedSelected.forEach((item, idx) => {
            if (onReorderColumns) {
              // Each column should be moved to position right after target
              // This maintains their relative order
              onReorderColumns(currentSheet.name, item.id, targetColumnId)
            }
          })
        }
      } else {
        // Move single column
        const targetColumn = currentSheet.columns[currentIndex - 1]
        // Animate the swap
        setColumnAnimations((prev) => {
          const newMap = new Map(prev)
          newMap.set(columnId, 'column-slide-left')
          newMap.set(targetColumn.id, 'column-slide-right')
          return newMap
        })

        // Clear animations after they complete
        setTimeout(() => {
          setColumnAnimations((prev) => {
            const newMap = new Map(prev)
            newMap.delete(columnId)
            newMap.delete(targetColumn.id)
            return newMap
          })
        }, 300)

        onReorderColumns?.(currentSheet.name, columnId, targetColumn.id)
      }
    }
  }

  const moveColumnRight = (columnId: string) => {
    const currentIndex = currentSheet.columns.findIndex(
      (col) => col.id === columnId,
    )
    if (currentIndex < currentSheet.columns.length - 1) {
      // Clear selection to prevent visual bugs
      setSelectedCell(null)
      setSelectedRange(null)
      setSelectionAnchor(null)

      if (selectedColumns.size > 1 && selectedColumns.has(columnId)) {
        // Move all selected columns as a group
        const selectedIndices = Array.from(selectedColumns)
          .map((id) => ({
            id,
            index: currentSheet.columns.findIndex((col) => col.id === id),
          }))
          .filter((item) => item.index !== -1)
          .sort((a, b) => a.index - b.index)

        // Find the rightmost selected column
        const rightmostIndex = selectedIndices[selectedIndices.length - 1].index

        // Can only move if there's space to the right
        if (rightmostIndex < currentSheet.columns.length - 1) {
          const targetIndex = rightmostIndex + 1
          const targetColumnId = currentSheet.columns[targetIndex].id

          // Animate all selected columns
          selectedColumns.forEach((colId) => {
            setColumnAnimations((prev) => {
              const newMap = new Map(prev)
              newMap.set(colId, 'column-slide-right')
              return newMap
            })
          })

          // Clear animations after they complete
          setTimeout(() => {
            setColumnAnimations((prev) => {
              const newMap = new Map(prev)
              selectedColumns.forEach((colId) => newMap.delete(colId))
              return newMap
            })
          }, 300)

          // To move right, we need to move in normal order (left to right)
          // and position each after the target

          // Get the column that will be after all our selected columns
          const afterTargetIndex = rightmostIndex + 2
          const afterTargetId =
            afterTargetIndex < currentSheet.columns.length
              ? currentSheet.columns[afterTargetIndex].id
              : null

          if (afterTargetId) {
            // Move each selected column to be before the "after target"
            selectedIndices.forEach((item) => {
              if (onReorderColumns) {
                onReorderColumns(currentSheet.name, item.id, afterTargetId)
              }
            })
          } else {
            // Moving to the end - swap with the last column repeatedly
            // This is a bit tricky with the current API
            selectedIndices.forEach((item) => {
              if (onReorderColumns) {
                // Move to after the current last column
                const currentLastIndex = currentSheet.columns.length - 1
                if (item.index < currentLastIndex) {
                  onReorderColumns(
                    currentSheet.name,
                    item.id,
                    currentSheet.columns[currentLastIndex].id,
                  )
                }
              }
            })
          }
        }
      } else {
        // Move single column - existing logic...
        const targetColumn = currentSheet.columns[currentIndex + 1]
        // Animate the swap
        setColumnAnimations((prev) => {
          const newMap = new Map(prev)
          newMap.set(columnId, 'column-slide-right')
          newMap.set(targetColumn.id, 'column-slide-left')
          return newMap
        })

        // Clear animations after they complete
        setTimeout(() => {
          setColumnAnimations((prev) => {
            const newMap = new Map(prev)
            newMap.delete(columnId)
            newMap.delete(targetColumn.id)
            return newMap
          })
        }, 300)

        // Find the column after the target to move before it
        const afterTargetIndex = currentIndex + 2
        const moveBeforeColumn =
          afterTargetIndex < currentSheet.columns.length
            ? currentSheet.columns[afterTargetIndex].id
            : null

        if (moveBeforeColumn) {
          onReorderColumns?.(currentSheet.name, columnId, moveBeforeColumn)
        } else {
          // Move to the end - we need to handle this case
          // For now, swap with the last column
          onReorderColumns?.(currentSheet.name, columnId, targetColumn.id)
        }
      }
    }
  }

  const moveRowUp = (row: number) => {
    if (row > 1) {
      // Clear selection to prevent visual bugs
      setSelectedCell(null)
      setSelectedRange(null)
      setSelectionAnchor(null)

      if (selectedRows.size > 1 && selectedRows.has(row)) {
        // Move all selected rows as a group
        const selectedRowsArray = Array.from(selectedRows).sort((a, b) => a - b)
        const topRow = selectedRowsArray[0]

        if (topRow > 1) {
          const targetRow = topRow - 1

          // Animate all selected rows
          selectedRows.forEach((r) => {
            setRowAnimations((prev) => {
              const newMap = new Map(prev)
              newMap.set(r, 'row-slide-up')
              return newMap
            })
          })

          // Clear animations after they complete
          setTimeout(() => {
            setRowAnimations((prev) => {
              const newMap = new Map(prev)
              selectedRows.forEach((r) => newMap.delete(r))
              return newMap
            })
          }, 300)

          // Move rows from bottom to top to maintain order
          const reversedRows = [...selectedRowsArray].reverse()
          reversedRows.forEach((r) => {
            if (onReorderRows) {
              onReorderRows(currentSheet.name, r, targetRow)
            }
          })
        }
      } else {
        // Move single row
        // Animate the swap
        setRowAnimations((prev) => {
          const newMap = new Map(prev)
          newMap.set(row, 'row-slide-up')
          newMap.set(row - 1, 'row-slide-down')
          return newMap
        })

        // Clear animations after they complete
        setTimeout(() => {
          setRowAnimations((prev) => {
            const newMap = new Map(prev)
            newMap.delete(row)
            newMap.delete(row - 1)
            return newMap
          })
        }, 300)

        onReorderRows?.(currentSheet.name, row, row - 1)
      }
    }
  }

  const moveRowDown = (row: number, maxRows: number) => {
    if (row < maxRows) {
      // Clear selection to prevent visual bugs
      setSelectedCell(null)
      setSelectedRange(null)
      setSelectionAnchor(null)

      if (selectedRows.size > 1 && selectedRows.has(row)) {
        // Move all selected rows as a group
        const selectedRowsArray = Array.from(selectedRows).sort((a, b) => a - b)
        const bottomRow = selectedRowsArray[selectedRowsArray.length - 1]

        if (bottomRow < maxRows) {
          const targetRow = bottomRow + 1

          // Animate all selected rows
          selectedRows.forEach((r) => {
            setRowAnimations((prev) => {
              const newMap = new Map(prev)
              newMap.set(r, 'row-slide-down')
              return newMap
            })
          })

          // Clear animations after they complete
          setTimeout(() => {
            setRowAnimations((prev) => {
              const newMap = new Map(prev)
              selectedRows.forEach((r) => newMap.delete(r))
              return newMap
            })
          }, 300)

          // For moving down, we need to determine the correct target
          // If we're moving to position after targetRow, we need the row after that
          const afterTargetRow = bottomRow + 2

          if (afterTargetRow <= maxRows) {
            // Move rows from top to bottom to maintain order
            selectedRowsArray.forEach((r) => {
              if (onReorderRows) {
                onReorderRows(currentSheet.name, r, afterTargetRow)
              }
            })
          } else {
            // Moving to the end
            selectedRowsArray.forEach((r) => {
              if (onReorderRows && r < maxRows) {
                onReorderRows(currentSheet.name, r, maxRows)
              }
            })
          }
        }
      } else {
        // Move single row
        // Animate the swap
        setRowAnimations((prev) => {
          const newMap = new Map(prev)
          newMap.set(row, 'row-slide-down')
          newMap.set(row + 1, 'row-slide-up')
          return newMap
        })

        // Clear animations after they complete
        setTimeout(() => {
          setRowAnimations((prev) => {
            const newMap = new Map(prev)
            newMap.delete(row)
            newMap.delete(row + 1)
            return newMap
          })
        }, 300)

        onReorderRows?.(currentSheet.name, row, row + 1)
      }
    }
  }

  const columnTypes = [
    { value: 'text', label: 'Text', icon: getColumnTypeIcon('text') },
    { value: 'number', label: 'Number', icon: getColumnTypeIcon('number') },
    {
      value: 'currency',
      label: 'Currency',
      icon: getColumnTypeIcon('currency'),
    },
    {
      value: 'percentage',
      label: 'Percentage',
      icon: getColumnTypeIcon('percentage'),
    },
    { value: 'date', label: 'Date', icon: getColumnTypeIcon('date') },
  ]

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  ]

  const handleColumnHeaderClick = (columnId: string, e: React.MouseEvent) => {
    // Prevent event from bubbling up
    e.stopPropagation()

    // Clear any existing cell selection
    setSelectedCell(null)
    setSelectedRange(null)
    setSelectionAnchor(null)

    // Handle column selection
    if (e.shiftKey && columnSelectionAnchor) {
      const currentSheet = data?.sheets[activeSheet]
      if (!currentSheet) return

      const anchorIndex = currentSheet.columns.findIndex(
        (c) => c.id === columnSelectionAnchor,
      )
      const currentIndex = currentSheet.columns.findIndex(
        (c) => c.id === columnId,
      )
      const start = Math.min(anchorIndex, currentIndex)
      const end = Math.max(anchorIndex, currentIndex)

      const newSelection = new Set<string>()
      for (let i = start; i <= end; i++) {
        newSelection.add(currentSheet.columns[i].id)
      }
      setSelectedColumns(newSelection)
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedColumns((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(columnId)) {
          newSet.delete(columnId)
        } else {
          newSet.add(columnId)
        }
        return newSet
      })
      setColumnSelectionAnchor(columnId)
    } else {
      // Single column selection
      setSelectedColumns(new Set([columnId]))
      setColumnSelectionAnchor(columnId)
      setSelectedRows(new Set())
      setRowSelectionAnchor(null)
    }

    // Only edit header on double-click, not single click
    if (e.detail === 2) {
      const currentSheet = data?.sheets[activeSheet]
      if (!currentSheet) return

      setEditingColumnHeader(columnId)
      setEditColumnValue(
        currentSheet.columns.find((c) => c.id === columnId)?.header || '',
      )
    }

    // Show formatting ribbon for column selection
    if (selectedColumns.has(columnId) || selectedColumns.size === 0) {
      const element = document.querySelector(`[data-column-id="${columnId}"]`)
      if (element) {
        const rect = element.getBoundingClientRect()
        setRibbonPosition({ x: rect.left + rect.width / 2, y: rect.bottom })
        setShowFormattingRibbon(true)
      }
    }
  }

  const handleRowHeaderClick = (row: number, e: React.MouseEvent) => {
    e.stopPropagation()

    // Clear any existing cell selection
    setSelectedCell(null)
    setSelectedRange(null)
    setSelectionAnchor(null)

    // Handle row selection
    if (e.shiftKey && rowSelectionAnchor !== null) {
      const start = Math.min(rowSelectionAnchor, row)
      const end = Math.max(rowSelectionAnchor, row)
      const newSelection = new Set<number>()
      for (let i = start; i <= end; i++) {
        newSelection.add(i)
      }
      setSelectedRows(newSelection)
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedRows((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(row)) {
          newSet.delete(row)
        } else {
          newSet.add(row)
        }
        return newSet
      })
      setRowSelectionAnchor(row)
    } else {
      // Single row selection
      setSelectedRows(new Set([row]))
      setRowSelectionAnchor(row)
      setSelectedColumns(new Set())
      setColumnSelectionAnchor(null)
    }
  }

  const handleColumnHeaderUpdate = () => {
    if (editingColumnHeader && editColumnValue.trim()) {
      onUpdateColumn?.(currentSheet.name, editingColumnHeader, {
        header: editColumnValue,
      })
      setEditingColumnHeader(null)
      setEditColumnValue('')
    }
  }

  const handleColumnTypeChange = (columnId: string, newType: string) => {
    if (newType === 'currency') {
      setShowCurrencyMenu(columnId)
      setShowColumnTypeMenu(null)
    } else {
      onUpdateColumn?.(currentSheet.name, columnId, { type: newType })
      setShowColumnTypeMenu(null)
    }
  }

  const handleCurrencySelect = (columnId: string, currencyCode: string) => {
    const updates = {
      type: 'currency',
      format: currencyCode,
    }
    onUpdateColumn?.(currentSheet.name, columnId, updates)
    setShowCurrencyMenu(null)
    setShowColumnTypeMenu(null)
    setCustomCurrencyInput('')
  }

  const handleCustomCurrency = (columnId: string) => {
    if (customCurrencyInput.trim()) {
      handleCurrencySelect(columnId, customCurrencyInput.trim().toUpperCase())
    }
  }

  const getSmartColumnWidth = (column: any): number => {
    // Base width on content type and header length
    const headerLength = column.header.length
    const minWidth = 140 // Increased from 80 to accommodate icon, name, and index
    const charWidth = 8

    const baseWidth = Math.max(minWidth, headerLength * charWidth + 60) // Increased padding from 40 to 60

    // Adjust based on type
    switch (column.type) {
      case 'currency':
        return Math.max(baseWidth, 160) // Increased from 120
      case 'date':
        return Math.max(baseWidth, 150) // Increased from 110
      case 'percentage':
        return Math.max(baseWidth, 140) // Increased from 100
      default:
        return baseWidth
    }
  }

  const handleColumnResize = (
    columnId: string,
    startX: number,
    startWidth: number,
  ) => {
    setResizingColumn(columnId)
    const startWidths = new Map<string, number>()

    // If multiple columns selected, track all their widths
    if (selectedColumns.size > 1 && selectedColumns.has(columnId)) {
      selectedColumns.forEach((colId) => {
        const col = currentSheet.columns.find((c) => c.id === colId)
        if (col) {
          startWidths.set(colId, col.width || getSmartColumnWidth(col))
        }
      })
    } else {
      startWidths.set(columnId, startWidth)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX

      startWidths.forEach((width, colId) => {
        const newWidth = Math.max(50, width + diff) // Minimum 50px
        const colElement = document.querySelector(
          `[data-column-id="${colId}"]`,
        ) as HTMLElement
        if (colElement) {
          colElement.style.width = `${newWidth}px`
        }
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      const diff = e.clientX - startX

      // Update all resized columns
      startWidths.forEach((width, colId) => {
        const newWidth = Math.max(50, width + diff)
        onUpdateColumn?.(currentSheet.name, colId, {
          header:
            currentSheet.columns.find((c) => c.id === colId)?.header || '',
          type: currentSheet.columns.find((c) => c.id === colId)?.type,
          format: currentSheet.columns.find((c) => c.id === colId)?.format,
        })
      })

      setResizingColumn(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleDoubleClickResize = (columnId: string) => {
    // Auto-fit column to content
    const column = currentSheet.columns.find((c) => c.id === columnId)
    if (column) {
      const smartWidth = getSmartColumnWidth(column)
      onUpdateColumn?.(currentSheet.name, columnId, {
        width: smartWidth,
      } as any)
    }
  }

  const handleColorSelect = (color: string) => {
    // Apply color to selected cells
    if (selectedCell) {
      setCellColors((prev) => {
        const newMap = new Map(prev)
        newMap.set(selectedCell, color)
        return newMap
      })
      animateCellUpdate([selectedCell])
    }

    // Apply color to selected range
    if (selectedRange) {
      const cells = getCellsInRange(selectedRange)
      setCellColors((prev) => {
        const newMap = new Map(prev)
        cells.forEach((cell) => newMap.set(cell, color))
        return newMap
      })
      animateCellUpdate(cells)
    }

    // Apply color to selected columns
    if (selectedColumns.size > 0) {
      setColumnColors((prev) => {
        const newMap = new Map(prev)
        selectedColumns.forEach((col) => newMap.set(col, color))
        return newMap
      })
    }

    // Apply color to selected rows
    if (selectedRows.size > 0) {
      setRowColors((prev) => {
        const newMap = new Map(prev)
        selectedRows.forEach((row) => newMap.set(row, color))
        return newMap
      })
    }
  }

  const getCellStyle = (
    style?: CellStyle,
    backgroundColor?: string,
  ): string => {
    const baseStyle = 'px-3 py-2 text-sm'

    // If there's a custom background color, use it
    if (backgroundColor) {
      return `${baseStyle} ${style === 'header' ? 'font-semibold' : ''}`
    }

    switch (style) {
      case 'header':
        return `${baseStyle} bg-gray-100 font-semibold`
      case 'highlight':
        return `${baseStyle} bg-[#E5F5FF] font-medium`
      case 'subtle':
        return `${baseStyle} text-gray-500`
      case 'success':
        return `${baseStyle} bg-green-50 text-green-700`
      case 'warning':
        return `${baseStyle} bg-yellow-50 text-yellow-700`
      case 'danger':
        return `${baseStyle} bg-red-50 text-red-700`
      default:
        return baseStyle
    }
  }

  const formatCellValue = (cell: CellOriginal, column?: any): string => {
    if (cell.error) {
      return `#ERROR: ${cell.error}`
    }

    // Show AI formula if no value yet
    if (cell.formula && !cell.value) {
      if (cell.formula.startsWith('=AI:')) {
        return '' // Return empty string instead of "Calculating..."
      }
      return cell.formula
    }

    if (cell.value === null || cell.value === undefined) {
      return ''
    }

    switch (cell.type) {
      case 'currency':
        const currencyCode = column?.format || 'USD'
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
          }).format(Number(cell.value))
        } catch {
          // Fallback for custom currencies
          const currency = currencies.find((c) => c.code === currencyCode)
          const symbol = currency?.symbol || currencyCode
          return `${symbol} ${Number(cell.value).toFixed(2)}`
        }
      case 'percentage':
        return `${Number(cell.value) * 100}%`
      case 'date':
        return new Date(cell.value as string).toLocaleDateString()
      default:
        return String(cell.value)
    }
  }

  const getRangeDisplay = (): string => {
    if (selectedRange) {
      const cells = getCellsInRange(selectedRange)
      const startCol = columnToIndex(selectedRange.start.col)
      const endCol = columnToIndex(selectedRange.end.col)
      const startRow = selectedRange.start.row
      const endRow = selectedRange.end.row

      const cols = Math.abs(endCol - startCol) + 1
      const rows = Math.abs(endRow - startRow) + 1

      if (cols === 1 && rows === 1) {
        return '1 cell'
      }
      return `${cells.length} cells (${rows}R × ${cols}C)`
    }
    return ''
  }

  // Get position for fill handle
  const getFillHandlePosition = () => {
    if (!selectedCell && !selectedRange) return null

    const cellRef = selectedRange
      ? `${selectedRange.end.col}${selectedRange.end.row}`
      : selectedCell

    const cellElement = document.querySelector(`[data-cell="${cellRef}"]`)
    if (!cellElement) return null

    const rect = cellElement.getBoundingClientRect()
    const containerRect = gridRef.current?.getBoundingClientRect()

    if (!containerRect) return null

    return {
      left: rect.right - containerRect.left - 8,
      top: rect.bottom - containerRect.top - 8,
    }
  }

  return (
    <div className='flex h-full flex-col bg-white'>
      {/* Diff Legend - show when in diff mode */}
      {diffMode && showDiffLegend && diff && (
        <div className='border-b border-gray-200 bg-gray-50 px-4 py-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4 text-sm'>
              <span className='font-medium text-gray-700'>Diff View</span>
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-1'>
                  <div className='h-3 w-3 rounded bg-green-400'></div>
                  <span className='text-gray-600'>Added</span>
                </div>
                <div className='flex items-center gap-1'>
                  <div className='h-3 w-3 rounded bg-red-400'></div>
                  <span className='text-gray-600'>Removed</span>
                </div>
                <div className='flex items-center gap-1'>
                  <div className='h-3 w-3 rounded bg-yellow-400'></div>
                  <span className='text-gray-600'>Modified</span>
                </div>
              </div>
            </div>
            <div className='text-sm text-gray-500'>
              {diff.totalChanges} total changes
            </div>
          </div>
        </div>
      )}

      {/* Formatting Ribbon - now at the top */}
      <FormattingRibbon
        isVisible={
          showFormattingRibbon &&
          (!!selectedCell ||
            !!selectedRange ||
            selectedColumns.size > 0 ||
            selectedRows.size > 0)
        }
        selectionType={getSelectionType()}
        selectedCount={getSelectedCount()}
        currentFormat={getCurrentFormat()}
        onFormatChange={handleFormatChange}
        onClose={() => setShowFormattingRibbon(false)}
      />

      {/* Grid */}
      <div ref={gridRef} className='relative flex-1 select-none overflow-auto'>
        {/* Resize indicator removed */}
        <div className='inline-block min-w-full'>
          <table className='spreadsheet-table w-full border-collapse'>
            <thead className='sticky top-0 z-10 bg-gray-50'>
              <tr>
                <th className='sticky left-0 z-20 w-12 border-b border-r border-gray-200 bg-white'></th>
                {currentSheet.columns.map((column, colIndex) => {
                  // Get diff info for column
                  const columnDiff = diffMode
                    ? getColumnDiff(currentSheet.name, column.id)
                    : null

                  // Determine diff classes for column
                  const getColumnDiffClasses = () => {
                    if (!diffMode || !columnDiff) return ''

                    switch (columnDiff.type) {
                      case 'added':
                        return 'bg-green-100 border-green-300'
                      case 'removed':
                        return 'bg-red-100 border-red-300'
                      case 'modified':
                        return 'bg-yellow-100 border-yellow-300'
                      default:
                        return ''
                    }
                  }

                  return (
                    <th
                      key={column.id}
                      data-column-id={column.id}
                      style={{
                        width: `${column.width || getSmartColumnWidth(column)}px`,
                        minWidth: `${column.width || getSmartColumnWidth(column)}px`,
                        maxWidth: `${column.width || getSmartColumnWidth(column)}px`,
                      }}
                      className={`group relative border-x border-gray-200 text-center transition-all duration-200 ${
                        selectedColumns.has(column.id)
                          ? 'selected-column bg-[#E5F5FF] shadow-sm'
                          : diffMode && columnDiff
                            ? getColumnDiffClasses()
                            : 'bg-white hover:bg-gray-50'
                      } ${draggedColumn === column.id ? 'opacity-50' : ''} ${
                        dropTargetColumn === column.id
                          ? 'border-l-2 border-l-[#0098FC]'
                          : ''
                      } ${resizingColumn === column.id ? 'bg-gray-100' : ''} ${
                        columnAnimations.get(column.id) || ''
                      }`}>
                      {/* Clean column header layout - draggable by default */}
                      <div
                        className='relative h-11 cursor-move px-8 py-2'
                        draggable
                        onDragStart={(e) => {
                          // Check if we're dragging from interactive elements
                          const target = e.target as HTMLElement
                          if (
                            target.tagName === 'BUTTON' ||
                            target.tagName === 'INPUT' ||
                            target.tagName === 'SVG' ||
                            target.tagName === 'PATH'
                          ) {
                            e.preventDefault()
                            return
                          }
                          e.stopPropagation()
                          setDraggedColumn(column.id)
                          e.dataTransfer.effectAllowed = 'move'
                          if (
                            selectedColumns.size > 1 &&
                            selectedColumns.has(column.id)
                          ) {
                            e.dataTransfer.setData(
                              'text/plain',
                              `group:${Array.from(selectedColumns).join(',')}`,
                            )
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedColumn(null)
                          setDropTargetColumn(null)
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          if (draggedColumn && draggedColumn !== column.id) {
                            setDropTargetColumn(column.id)
                          }
                        }}
                        onDragLeave={() => setDropTargetColumn(null)}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (draggedColumn && draggedColumn !== column.id) {
                            setSelectedCell(null)
                            setSelectedRange(null)
                            setSelectionAnchor(null)

                            const dragData =
                              e.dataTransfer.getData('text/plain')
                            const isGroup = dragData.startsWith('group:')

                            if (isGroup && selectedColumns.size > 1) {
                              const selectedArray = Array.from(selectedColumns)
                              selectedColumns.forEach((colId) => {
                                setColumnAnimations((prev) => {
                                  const newMap = new Map(prev)
                                  newMap.set(colId, 'spring-settle')
                                  return newMap
                                })
                              })
                              setTimeout(() => {
                                setColumnAnimations((prev) => {
                                  const newMap = new Map(prev)
                                  selectedColumns.forEach((colId) =>
                                    newMap.delete(colId),
                                  )
                                  return newMap
                                })
                              }, 500)
                              selectedArray.forEach((colId) => {
                                if (onReorderColumns) {
                                  onReorderColumns(
                                    currentSheet.name,
                                    colId,
                                    column.id,
                                  )
                                }
                              })
                            } else {
                              setColumnAnimations((prev) => {
                                const newMap = new Map(prev)
                                newMap.set(draggedColumn, 'spring-settle')
                                return newMap
                              })
                              setTimeout(() => {
                                setColumnAnimations((prev) => {
                                  const newMap = new Map(prev)
                                  newMap.delete(draggedColumn)
                                  return newMap
                                })
                              }, 500)
                              onReorderColumns?.(
                                currentSheet.name,
                                draggedColumn,
                                column.id,
                              )
                            }
                          }
                          setDraggedColumn(null)
                          setDropTargetColumn(null)
                        }}
                        onClick={(e) => {
                          // Only handle selection if not clicking on interactive elements
                          const target = e.target as HTMLElement
                          if (
                            target.tagName === 'BUTTON' ||
                            target.tagName === 'INPUT'
                          ) {
                            return
                          }
                          // Let column header click handler manage selection
                          handleColumnHeaderClick(column.id, e)
                        }}>
                        {/* Column content */}
                        <div className='flex h-full items-center justify-center gap-2'>
                          {/* Type icon - using original getColumnTypeIcon */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowColumnTypeMenu(
                                showColumnTypeMenu === column.id
                                  ? null
                                  : column.id,
                              )
                            }}
                            className='flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-700'
                            title='Change column type'>
                            {getColumnTypeIcon(column.type, column.format)}
                          </button>

                          {/* Column name and ID */}
                          {editingColumnHeader === column.id ? (
                            <input
                              type='text'
                              value={editColumnValue}
                              onChange={(e) =>
                                setEditColumnValue(e.target.value)
                              }
                              onBlur={handleColumnHeaderUpdate}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key === 'Enter') {
                                  handleColumnHeaderUpdate()
                                } else if (e.key === 'Escape') {
                                  setEditingColumnHeader(null)
                                  setEditColumnValue('')
                                }
                              }}
                              className='w-full bg-transparent text-center text-sm font-medium text-gray-900 outline-none'
                              autoFocus
                            />
                          ) : (
                            <div
                              className='flex items-center justify-center gap-2'
                              onClick={(e) => {
                                e.stopPropagation()
                                handleColumnHeaderClick(column.id, e)
                              }}>
                              {diffMode && columnDiff?.type === 'modified' ? (
                                <div className='flex flex-col items-center gap-0'>
                                  <span className='text-xs text-red-600 line-through opacity-70'>
                                    {columnDiff.oldHeader}
                                  </span>
                                  <span className='text-sm font-medium text-green-700'>
                                    {columnDiff.newHeader}
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className={`text-sm font-medium ${
                                    columnDiff?.type === 'removed'
                                      ? 'text-red-700 line-through'
                                      : columnDiff?.type === 'added'
                                        ? 'text-green-700'
                                        : 'text-gray-900 hover:text-gray-700'
                                  }`}>
                                  {column.header}
                                </span>
                              )}
                              <span className='text-sm font-normal text-gray-400'>
                                {indexToColumnLabel(colIndex)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Navigation arrows - fixed position, appear on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            moveColumnLeft(column.id)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded bg-white p-0.5 text-gray-400 opacity-0 shadow-sm transition-all hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 ${
                            colIndex === 0 ? 'invisible' : ''
                          }`}>
                          <svg
                            className='h-3 w-3'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'>
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M15 19l-7-7 7-7'
                            />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            moveColumnRight(column.id)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded bg-white p-0.5 text-gray-400 opacity-0 shadow-sm transition-all hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 ${
                            colIndex === currentSheet.columns.length - 1
                              ? 'invisible'
                              : ''
                          }`}
                          title='Move right'>
                          <svg
                            className='h-3 w-3'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'>
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M9 5l7 7-7 7'
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Column resize handle - Apple style */}
                      <div
                        className='absolute -right-[1px] top-0 h-full w-1 cursor-col-resize hover:bg-[#0098FC]'
                        onMouseDown={(e) => {
                          e.preventDefault()
                          const startX = e.clientX
                          const startWidth =
                            column.width || getSmartColumnWidth(column)
                          handleColumnResize(column.id, startX, startWidth)
                        }}
                        onDoubleClick={() => handleDoubleClickResize(column.id)}
                        title='Drag to resize, double-click to auto-fit'
                      />

                      {/* Column Type Menu */}
                      {showColumnTypeMenu === column.id && (
                        <div className='column-type-menu absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg'>
                          {columnTypes.map((type) => (
                            <button
                              key={type.value}
                              onClick={() =>
                                handleColumnTypeChange(column.id, type.value)
                              }
                              className={`flex w-full items-center space-x-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                                column.type === type.value
                                  ? 'bg-[#E5F5FF] text-[#0098FC]'
                                  : 'text-gray-700'
                              }`}>
                              <span className='text-gray-500'>{type.icon}</span>
                              <span>{type.label}</span>
                              {column.type === type.value && (
                                <svg
                                  className='ml-auto h-4 w-4'
                                  fill='none'
                                  stroke='currentColor'
                                  viewBox='0 0 24 24'>
                                  <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M5 13l4 4L19 7'
                                  />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Currency Selection Menu */}
                      {showCurrencyMenu === column.id && (
                        <div className='currency-menu absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg'>
                          <div className='max-h-80 overflow-y-auto py-1'>
                            <div className='sticky top-0 border-b border-gray-200 bg-white px-3 py-2'>
                              <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-700'>
                                Select Currency
                              </h3>
                            </div>
                            {currencies.map((currency) => (
                              <button
                                key={currency.code}
                                onClick={() =>
                                  handleCurrencySelect(column.id, currency.code)
                                }
                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                                  column.format === currency.code
                                    ? 'bg-[#E5F5FF] text-[#0098FC]'
                                    : 'text-gray-700'
                                }`}>
                                <div className='flex items-center space-x-2'>
                                  <span className='font-mono'>
                                    {currency.symbol}
                                  </span>
                                  <span>{currency.name}</span>
                                </div>
                                <span className='text-xs text-gray-500'>
                                  {currency.code}
                                </span>
                              </button>
                            ))}
                            <div className='border-t border-gray-200 p-3'>
                              <div className='flex items-center space-x-2'>
                                <input
                                  type='text'
                                  value={customCurrencyInput}
                                  onChange={(e) =>
                                    setCustomCurrencyInput(
                                      e.target.value.toUpperCase(),
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleCustomCurrency(column.id)
                                    }
                                  }}
                                  placeholder='Custom (e.g., BTC, EUR)'
                                  className='flex-1 rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-[#0098FC]'
                                />
                                <button
                                  onClick={() =>
                                    handleCustomCurrency(column.id)
                                  }
                                  disabled={!customCurrencyInput.trim()}
                                  className='rounded bg-[#0098FC] px-3 py-1 text-sm text-white hover:bg-[#0087E5] disabled:bg-gray-300'>
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </th>
                  )
                })}
                {/* Add Column Button */}
                <th className='relative w-12 border-x border-gray-200 bg-white text-center transition-all duration-200 hover:bg-gray-50'>
                  <button
                    onClick={addNewColumn}
                    className='flex h-11 w-full items-center justify-center text-gray-400 hover:text-[#0098FC]'
                    title='Add new column'>
                    <svg
                      className='h-5 w-5'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 4v16m8-8H4'
                      />
                    </svg>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: getMaxRow() }, (_, i) => i + 1).map(
                (row) => {
                  // Check if any cell in this row has wrapped text
                  const hasWrappedCell = currentSheet.columns.some((column) => {
                    const cellRef = `${column.id}${row}`
                    const format = cellFormats.get(cellRef)
                    return format?.wrapMode === 'wrap'
                  })

                  return (
                    <tr
                      key={row}
                      className={`${draggedRow === row ? 'dragging' : ''} ${rowAnimations.get(row) || ''} transition-all duration-200`}>
                      <td
                        className={`group sticky left-0 z-10 w-12 border-r border-gray-200 text-center text-xs font-medium transition-all duration-200 ${
                          selectedRows.has(row)
                            ? 'selected-row bg-[#E5F5FF] shadow-sm'
                            : 'bg-white hover:bg-gray-50'
                        } ${draggedRow === row ? 'opacity-50' : ''} ${
                          dropTargetRow === row
                            ? 'border-t-2 border-t-[#0098FC]'
                            : ''
                        }`}>
                        <div
                          className='relative flex h-full cursor-move items-center justify-center'
                          onClick={(e) => handleRowHeaderClick(row, e)}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation()
                            setDraggedRow(row)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragEnd={(e) => {
                            e.stopPropagation()
                            setDraggedRow(null)
                            setDropTargetRow(null)
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (draggedRow && draggedRow !== row) {
                              setDropTargetRow(row)
                            }
                          }}
                          onDragLeave={(e) => {
                            e.stopPropagation()
                            setDropTargetRow(null)
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (draggedRow && draggedRow !== row) {
                              setSelectedCell(null)
                              setSelectedRange(null)
                              setSelectionAnchor(null)
                              setRowAnimations((prev) => {
                                const newMap = new Map(prev)
                                newMap.set(draggedRow, 'spring-settle')
                                return newMap
                              })
                              setTimeout(() => {
                                setRowAnimations((prev) => {
                                  const newMap = new Map(prev)
                                  newMap.delete(draggedRow)
                                  return newMap
                                })
                              }, 500)
                              onReorderRows?.(
                                currentSheet.name,
                                draggedRow,
                                row,
                              )
                            }
                            setDraggedRow(null)
                            setDropTargetRow(null)
                          }}>
                          {/* Row number - centered and clean */}
                          <span className='text-sm font-normal text-gray-600'>
                            {row}
                          </span>

                          {/* Navigation arrows - subtle, appear on hover */}
                          <button
                            onClick={() => moveRowUp(row)}
                            className={`absolute left-0 top-0 rounded p-0.5 text-gray-400 opacity-0 transition-all hover:text-gray-600 group-hover:opacity-100 ${
                              row === 1 ? 'invisible' : ''
                            }`}>
                            <svg
                              className='h-3 w-3'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'>
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M5 15l7-7 7 7'
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveRowDown(row, getMaxRow())}
                            className={`absolute bottom-0 left-0 rounded p-0.5 text-gray-400 opacity-0 transition-all hover:text-gray-600 group-hover:opacity-100 ${
                              row === getMaxRow() ? 'invisible' : ''
                            }`}>
                            <svg
                              className='h-3 w-3'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'>
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M19 9l-7 7-7-7'
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                      {currentSheet.columns.map((column) => {
                        const cellRef = `${column.id}${row}`
                        const cell = currentSheet.cells.get(cellRef)
                        const isSelected = selectedCell === cellRef
                        const isInSelection =
                          selectedRange && isInRange(cellRef, selectedRange)
                        const isInFillPreview =
                          fillPreviewRange &&
                          isInRange(cellRef, fillPreviewRange) &&
                          !(selectedRange && isInRange(cellRef, selectedRange))
                        const isEditing = editingCell === cellRef
                        const isInEditingRange =
                          editingRange &&
                          editingCell &&
                          isInRange(cellRef, editingRange)
                        const isCellBeingProcessed = isCellProcessing(cellRef)

                        // Determine background color (cell > column > row)
                        const backgroundColor =
                          cellColors.get(cellRef) ||
                          columnColors.get(column.id) ||
                          rowColors.get(row)

                        // Get diff info for this cell
                        const cellDiff = diffMode
                          ? getCellDiff(currentSheet.name, cellRef)
                          : null
                        const rowDiff = diffMode
                          ? getRowDiff(currentSheet.name, row)
                          : null

                        // Determine diff classes
                        const getDiffClasses = () => {
                          if (!diffMode) return ''

                          if (rowDiff?.type === 'added') {
                            return 'bg-green-50 border-green-200'
                          }
                          if (rowDiff?.type === 'removed') {
                            return 'bg-red-50 border-red-200'
                          }

                          if (cellDiff) {
                            switch (cellDiff.type) {
                              case 'added':
                                return 'bg-green-50 border-green-300'
                              case 'removed':
                                return 'bg-red-50 border-red-300'
                              case 'modified':
                                return 'bg-yellow-50 border-yellow-300'
                            }
                          }

                          return ''
                        }

                        return (
                          <td
                            key={cellRef}
                            data-cell={cellRef}
                            style={{
                              width: `${column.width || getSmartColumnWidth(column)}px`,
                              minWidth: `${column.width || getSmartColumnWidth(column)}px`,
                              maxWidth: `${column.width || getSmartColumnWidth(column)}px`,
                            }}
                            onMouseDown={(e) => handleCellMouseDown(cellRef, e)}
                            onMouseEnter={() => {
                              handleCellMouseEnter(cellRef)
                              setHoveredCell(cellRef)
                            }}
                            onMouseLeave={() => setHoveredCell(null)}
                            onDoubleClick={() => handleCellDoubleClick(cellRef)}
                            className={`${getCellStyle(cell?.style, backgroundColor)} ${
                              isSelected && !isInSelection
                                ? 'z-10 ring-2 ring-inset ring-[#0098FC]'
                                : ''
                            } ${
                              isInSelection && !isInEditingRange
                                ? 'selected-cell z-5'
                                : ''
                            } ${
                              isInEditingRange ? 'editing-range-cell z-5' : ''
                            } ${isInFillPreview ? 'fill-preview-cell' : ''} ${
                              isCellBeingProcessed ? 'processing-cell' : ''
                            } ${
                              animatingCells.has(cellRef)
                                ? 'cell-update-glow'
                                : ''
                            } ${getDiffClasses()} relative ${cellFormats.get(cellRef)?.wrapMode === 'wrap' ? 'wrapped-cell' : ''} spreadsheet-cell group cursor-cell border-b border-r border-gray-200 transition-all`}>
                            <div
                              className='absolute inset-0'
                              style={{
                                backgroundColor: backgroundColor || undefined,
                                opacity: backgroundColor ? 0.9 : 1,
                              }}
                            />
                            {isInSelection && !isInEditingRange && (
                              <div className='pointer-events-none absolute inset-0 bg-[#0098FC] opacity-10' />
                            )}
                            {isInEditingRange && (
                              <div className='pointer-events-none absolute inset-0 bg-[#0098FC] opacity-15 ring-1 ring-inset ring-[#0098FC]/60' />
                            )}
                            {isInFillPreview && (
                              <div className='pointer-events-none absolute inset-0 border border-dashed border-[#0098FC] bg-[#0098FC] opacity-10' />
                            )}
                            {isCellBeingProcessed && (
                              <div className='pointer-events-none absolute inset-0 border border-yellow-300 bg-yellow-50 opacity-50' />
                            )}
                            {isEditing ? (
                              <input
                                type='text'
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value)
                                  // Check if user is typing =AI:
                                  if (
                                    e.target.value.toLowerCase() === '=ai:' &&
                                    !showAIAssistant
                                  ) {
                                    handleAIFormulaStart()
                                  }
                                }}
                                onBlur={handleEditComplete}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleEditComplete()
                                    // Only move if not editing a range
                                    if (!editingRange) {
                                      const nextCell = `${column.id}${row + 1}`
                                      setSelectedCell(nextCell)
                                    }
                                  } else if (e.key === 'Tab') {
                                    e.preventDefault()
                                    handleEditComplete()
                                    // Only move if not editing a range
                                    if (!editingRange) {
                                      const colIndex = columnToIndex(column.id)
                                      if (e.shiftKey && colIndex > 0) {
                                        const prevCol =
                                          currentSheet.columns[colIndex - 1].id
                                        setSelectedCell(`${prevCol}${row}`)
                                      } else if (
                                        !e.shiftKey &&
                                        colIndex <
                                          currentSheet.columns.length - 1
                                      ) {
                                        const nextCol =
                                          currentSheet.columns[colIndex + 1].id
                                        setSelectedCell(`${nextCol}${row}`)
                                      }
                                    }
                                  } else if (e.key === 'Escape') {
                                    setEditingCell(null)
                                    setEditingRange(null)
                                    setEditValue('')
                                    // Keep the range selected when canceling
                                  }
                                }}
                                className='absolute inset-0 z-20 w-full bg-white px-3 py-2 text-sm outline-none'
                                autoFocus
                              />
                            ) : (
                              <div className='relative z-10 flex h-full items-center px-2 py-1'>
                                {isCellBeingProcessed ? (
                                  <div className='flex items-center justify-center'>
                                    <Spinner size='sm' />
                                  </div>
                                ) : (
                                  <>
                                    {/* Render diff content if in diff mode */}
                                    {diffMode && cellDiff ? (
                                      <div className='flex flex-col gap-0.5'>
                                        {cellDiff.type === 'modified' && (
                                          <span className='text-xs text-red-600 line-through opacity-70'>
                                            {formatDiffValue(
                                              cellDiff.oldValue,
                                            ) || '(empty)'}
                                          </span>
                                        )}
                                        {cellDiff.type === 'removed' ? (
                                          <span className='text-sm text-red-600 line-through opacity-70'>
                                            {formatDiffValue(cellDiff.oldValue)}
                                          </span>
                                        ) : (
                                          <span
                                            className={`text-sm ${
                                              cellDiff.type === 'added'
                                                ? 'font-medium text-green-700'
                                                : cellDiff.type === 'modified'
                                                  ? 'font-medium text-green-700'
                                                  : ''
                                            }`}>
                                            {cellDiff.newValue !== undefined
                                              ? formatDiffValue(
                                                  cellDiff.newValue,
                                                )
                                              : formatCellValue(
                                                  cell || { value: null },
                                                  column,
                                                )}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span
                                        className={`text-sm leading-normal ${
                                          animatingCells.has(cellRef)
                                            ? column.type === 'number' ||
                                              column.type === 'currency' ||
                                              column.type === 'percentage'
                                              ? 'cell-content-number'
                                              : 'cell-content-text'
                                            : ''
                                        } ${cellFormats.get(cellRef)?.wrapMode === 'wrap' ? 'whitespace-normal' : 'truncate'} ${
                                          // Apply text formatting from cellFormats
                                          (() => {
                                            const format =
                                              cellFormats.get(cellRef)
                                            if (!format) return ''
                                            const classes = []
                                            if (format.bold)
                                              classes.push('font-bold')
                                            if (format.italic)
                                              classes.push('italic')
                                            if (format.underline)
                                              classes.push('underline')
                                            if (format.alignment === 'center')
                                              classes.push('w-full text-center')
                                            if (format.alignment === 'right')
                                              classes.push('w-full text-right')
                                            if (format.textColor)
                                              classes.push(
                                                `text-[${format.textColor}]`,
                                              )
                                            return classes.join(' ')
                                          })()
                                        } ${rowDiff?.type === 'removed' ? 'line-through opacity-70' : ''}`}
                                        style={{
                                          color:
                                            cellFormats.get(cellRef)
                                              ?.textColor || undefined,
                                        }}>
                                        {formatCellValue(
                                          cell || { value: null },
                                          column,
                                        )}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                },
              )}
              {/* Add Row Button */}
              <tr className='h-9'>
                <td className='sticky left-0 z-10 w-12 border-r border-gray-200 bg-white text-center hover:bg-gray-50'>
                  <button
                    onClick={addNewRow}
                    className='flex h-full w-full items-center justify-center text-gray-400 hover:text-[#0098FC]'
                    title='Add new row'>
                    <svg
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 4v16m8-8H4'
                      />
                    </svg>
                  </button>
                </td>
                {currentSheet.columns.map((column) => (
                  <td
                    key={`add-row-${column.id}`}
                    style={{
                      width: `${column.width || getSmartColumnWidth(column)}px`,
                      minWidth: `${column.width || getSmartColumnWidth(column)}px`,
                      maxWidth: `${column.width || getSmartColumnWidth(column)}px`,
                    }}
                    className='h-9 border-b border-r border-gray-200 bg-gray-50'
                  />
                ))}
                <td className='h-9 border-b border-gray-200 bg-gray-50' />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Fill Handle */}
        {(selectedCell || selectedRange) &&
          !editingCell &&
          (() => {
            const pos = getFillHandlePosition()
            return pos ? (
              <div
                ref={fillHandleRef}
                className='absolute h-2 w-2 cursor-crosshair bg-[#0098FC] hover:bg-[#0087E5]'
                style={{
                  left: `${pos.left}px`,
                  top: `${pos.top}px`,
                }}
                onMouseDown={handleFillHandleMouseDown}
              />
            ) : null
          })()}

        {/* Multi-cell edit indicator */}
        {editingCell && editingRange && (
          <div className='fixed bottom-4 right-4 z-50 rounded-lg bg-[#0098FC] px-4 py-2 text-white shadow-lg'>
            <div className='flex items-center space-x-2'>
              <svg
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                />
              </svg>
              <span className='text-sm font-medium'>
                Editing {getCellsInRange(editingRange).length} cells
              </span>
            </div>
          </div>
        )}
      </div>

      {/* AI Assistant Modal */}
      {showAIAssistant && editingCell && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4'>
          <div className='w-full max-w-lg'>
            <div className='overflow-hidden rounded-lg border bg-white shadow-lg'>
              {/* Header */}
              <div className='border-b bg-gray-50 px-4 py-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-2'>
                    <span className='text-sm font-bold'>AI</span>
                    <h3 className='text-sm font-medium text-gray-900'>
                      AI Formula
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowAIAssistant(false)
                      setAiPrompt('')
                    }}
                    className='rounded p-1 text-gray-400 hover:text-gray-600'>
                    <svg
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Input Area */}
              <div className='p-4'>
                <div className='relative'>
                  <input
                    type='text'
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAIFormulaSubmit()
                      }
                    }}
                    placeholder='Describe what to calculate (e.g., "sum column B")'
                    className='w-full rounded border border-gray-300 px-3 py-2 pr-10 text-sm outline-none focus:border-[#0098FC] focus:ring-1 focus:ring-[#0098FC]/20'
                    autoFocus
                  />
                  <button
                    onClick={handleAIFormulaSubmit}
                    disabled={!aiPrompt.trim() || aiProcessing}
                    className='absolute right-2 top-1/2 -translate-y-1/2 rounded bg-[#0098FC] p-1 text-white hover:bg-[#0087E5] disabled:cursor-not-allowed disabled:opacity-50'>
                    {aiProcessing ? (
                      <svg
                        className='h-4 w-4 animate-spin'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                        />
                      </svg>
                    ) : (
                      <svg
                        className='h-4 w-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M13 10V3L4 14h7v7l9-11h-7z'
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Quick Examples */}
                <div className='mt-3 text-xs text-gray-500'>
                  Examples: "sum column B", "average of A1:A10", "15% of total"
                </div>
              </div>

              {/* Status Bar */}
              {aiProcessing && (
                <div className='border-t bg-gray-50 px-4 py-2'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-1.5 w-1.5 animate-pulse rounded-full bg-[#0098FC]' />
                    <p className='text-xs text-gray-600'>Processing...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar with Sheet Tabs and Status */}
      <div className='flex border-t border-gray-200 bg-white'>
        {/* Sheet Tabs - Apple style with drag support */}
        <div className='flex flex-1 items-center overflow-x-auto border-r border-gray-200'>
          {data.sheets.map((sheet, index) => (
            <div
              key={sheet.name}
              draggable={editingSheetIndex !== index}
              onDragStart={(e) => {
                if (editingSheetIndex === index) {
                  e.preventDefault()
                  return
                }
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', index.toString())
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.classList.add(
                  'border-l-2',
                  'border-l-[#0098FC]',
                )
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove(
                  'border-l-2',
                  'border-l-[#0098FC]',
                )
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove(
                  'border-l-2',
                  'border-l-[#0098FC]',
                )
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
                if (fromIndex !== index) {
                  // Handle sheet reordering here
                  // Reorder sheets
                }
              }}
              className={`group relative flex h-8 items-center border-r border-gray-200 transition-all ${
                index === activeSheet
                  ? 'bg-gray-50'
                  : 'bg-white hover:bg-gray-50'
              }`}>
              {editingSheetIndex === index ? (
                <input
                  type='text'
                  value={editSheetName}
                  onChange={(e) => setEditSheetName(e.target.value)}
                  onBlur={() => {
                    // Update sheet name if changed
                    if (editSheetName.trim() && editSheetName !== sheet.name) {
                      // Call update handler if available
                      // Update sheet name
                    }
                    setEditingSheetIndex(null)
                    setEditSheetName('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    } else if (e.key === 'Escape') {
                      setEditingSheetIndex(null)
                      setEditSheetName('')
                    }
                  }}
                  className='h-full px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-inset focus:ring-[#0098FC]'
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setActiveSheet(index)}
                  onDoubleClick={() => {
                    setEditingSheetIndex(index)
                    setEditSheetName(sheet.name)
                  }}
                  className={`flex h-full items-center px-4 text-sm font-medium transition-colors ${
                    index === activeSheet
                      ? 'text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}>
                  {sheet.name}
                  {index === activeSheet && (
                    <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-[#0098FC]' />
                  )}
                </button>
              )}
              {data.sheets.length > 1 && editingSheetIndex !== index && (
                <button
                  onClick={() => onRemoveSheet?.(index)}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 ${
                    index === activeSheet ? 'opacity-100' : ''
                  }`}>
                  <svg
                    className='h-3 w-3'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Sheet Button - positioned at the bottom right */}
        <button
          onClick={() => setShowTemplateModal(true)}
          className='flex h-8 w-8 items-center justify-center border-r border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#0098FC]'
          title='Add new sheet'>
          <svg
            className='h-4 w-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 4v16m8-8H4'
            />
          </svg>
        </button>

        {/* Status Info */}
        <div className='flex items-center px-4 text-xs text-gray-600'>
          <div className='flex items-center space-x-4'>
            {selectedColumns.size > 0 || selectedRows.size > 0 ? (
              <>
                {selectedColumns.size > 0 && (
                  <span className='font-medium'>
                    {selectedColumns.size} column
                    {selectedColumns.size > 1 ? 's' : ''} selected
                  </span>
                )}
                {selectedColumns.size > 0 && selectedRows.size > 0 && (
                  <span className='text-gray-400'>|</span>
                )}
                {selectedRows.size > 0 && (
                  <span className='font-medium'>
                    {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''}{' '}
                    selected
                  </span>
                )}
                <span className='text-gray-400'>|</span>
                <span className='text-gray-500'>Press Esc to clear</span>
              </>
            ) : selectedRange ? (
              <>
                <span className='font-medium'>{getRangeDisplay()}</span>
                <span className='text-gray-400'>|</span>
                <span>
                  {selectedRange.start.col}
                  {selectedRange.start.row}:{selectedRange.end.col}
                  {selectedRange.end.row}
                </span>
              </>
            ) : selectedCell ? (
              <span className='font-medium'>{selectedCell}</span>
            ) : (
              <span className='text-gray-400'>No selection</span>
            )}
          </div>
        </div>
      </div>

      {/* Sheet Template Modal */}
      <SheetTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  )
}
