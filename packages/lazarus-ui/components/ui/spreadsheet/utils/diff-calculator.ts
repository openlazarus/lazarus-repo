import type { CellOriginal } from '../types'
import type {
  CellDiff,
  ColumnDiff,
  DiffType,
  RowDiff,
  Sheet,
  SheetDiff,
  SpreadsheetData,
  SpreadsheetDiff,
} from '../types/diff'

export function calculateSpreadsheetDiff(
  original: SpreadsheetData,
  modified: SpreadsheetData,
): SpreadsheetDiff {
  const sheetDiffs = new Map<string, SheetDiff>()
  let totalChanges = 0
  let changeIndex = 0

  // Process all sheets from both versions
  const allSheetNames = new Set([
    ...original.sheets.map((s) => s.name),
    ...modified.sheets.map((s) => s.name),
  ])

  for (const sheetName of Array.from(allSheetNames)) {
    const originalSheet = original.sheets.find((s) => s.name === sheetName)
    const modifiedSheet = modified.sheets.find((s) => s.name === sheetName)

    if (!originalSheet && modifiedSheet) {
      // Entire sheet added
      const sheetDiff = createSheetAddedDiff(modifiedSheet, changeIndex)
      sheetDiffs.set(sheetName, sheetDiff)
      totalChanges += countSheetChanges(sheetDiff)
      changeIndex += countSheetChanges(sheetDiff)
    } else if (originalSheet && !modifiedSheet) {
      // Entire sheet removed
      const sheetDiff = createSheetRemovedDiff(originalSheet, changeIndex)
      sheetDiffs.set(sheetName, sheetDiff)
      totalChanges += countSheetChanges(sheetDiff)
      changeIndex += countSheetChanges(sheetDiff)
    } else if (originalSheet && modifiedSheet) {
      // Sheet modified
      const sheetDiff = calculateSheetDiff(
        originalSheet,
        modifiedSheet,
        changeIndex,
      )
      if (countSheetChanges(sheetDiff) > 0) {
        sheetDiffs.set(sheetName, sheetDiff)
        totalChanges += countSheetChanges(sheetDiff)
        changeIndex += countSheetChanges(sheetDiff)
      }
    }
  }

  return {
    sheets: sheetDiffs,
    totalChanges,
  }
}

function calculateSheetDiff(
  original: Sheet,
  modified: Sheet,
  startChangeIndex: number,
): SheetDiff {
  const cellDiffs = new Map<string, CellDiff>()
  const columnDiffs = new Map<string, ColumnDiff>()
  const rowDiffs = new Map<number, RowDiff>()
  let changeIndex = startChangeIndex

  // Calculate column diffs
  const originalColumns = new Map(original.columns.map((col) => [col.id, col]))
  const modifiedColumns = new Map(modified.columns.map((col) => [col.id, col]))
  const allColumnIds = new Set([
    ...Array.from(originalColumns.keys()),
    ...Array.from(modifiedColumns.keys()),
  ])

  for (const columnId of Array.from(allColumnIds)) {
    const originalCol = originalColumns.get(columnId)
    const modifiedCol = modifiedColumns.get(columnId)

    if (!originalCol && modifiedCol) {
      columnDiffs.set(columnId, {
        columnId,
        type: 'added',
        newHeader: modifiedCol.header,
        newType: modifiedCol.type,
        changeIndex: changeIndex++,
      })
    } else if (originalCol && !modifiedCol) {
      columnDiffs.set(columnId, {
        columnId,
        type: 'removed',
        oldHeader: originalCol.header,
        oldType: originalCol.type,
        changeIndex: changeIndex++,
      })
    } else if (originalCol && modifiedCol) {
      if (
        originalCol.header !== modifiedCol.header ||
        originalCol.type !== modifiedCol.type
      ) {
        columnDiffs.set(columnId, {
          columnId,
          type: 'modified',
          oldHeader: originalCol.header,
          newHeader: modifiedCol.header,
          oldType: originalCol.type,
          newType: modifiedCol.type,
          changeIndex: changeIndex++,
        })
      }
    }
  }

  // Calculate row and cell diffs
  const originalCells = original.cells
  const modifiedCells = modified.cells
  const originalRows = new Set(
    Array.from(originalCells.keys()).map((ref) =>
      parseInt(ref.match(/\d+/)?.[0] || '0'),
    ),
  )
  const modifiedRows = new Set(
    Array.from(modifiedCells.keys()).map((ref) =>
      parseInt(ref.match(/\d+/)?.[0] || '0'),
    ),
  )
  const allRows = new Set([
    ...Array.from(originalRows),
    ...Array.from(modifiedRows),
  ])

  // Check for row additions/deletions
  for (const rowIndex of Array.from(allRows)) {
    if (!originalRows.has(rowIndex) && modifiedRows.has(rowIndex)) {
      rowDiffs.set(rowIndex, {
        rowIndex,
        type: 'added',
        changeIndex: changeIndex++,
      })
    } else if (originalRows.has(rowIndex) && !modifiedRows.has(rowIndex)) {
      rowDiffs.set(rowIndex, {
        rowIndex,
        type: 'removed',
        changeIndex: changeIndex++,
      })
    }
  }

  // Calculate cell diffs
  const allCellRefs = new Set([
    ...Array.from(originalCells.keys()),
    ...Array.from(modifiedCells.keys()),
  ])

  for (const cellRef of Array.from(allCellRefs)) {
    const originalCell = originalCells.get(cellRef)
    const modifiedCell = modifiedCells.get(cellRef)
    const rowIndex = parseInt(cellRef.match(/\d+/)?.[0] || '0')

    // Skip cells in added/removed rows (they're handled at row level)
    if (rowDiffs.has(rowIndex)) {
      continue
    }

    const diffType = getCellDiffType(originalCell, modifiedCell)
    if (diffType !== 'unchanged') {
      cellDiffs.set(cellRef, {
        cell: cellRef,
        type: diffType,
        oldValue:
          originalCell?.value === null ? undefined : originalCell?.value,
        newValue:
          modifiedCell?.value === null ? undefined : modifiedCell?.value,
        changeIndex: changeIndex++,
      })
    }
  }

  return {
    name: original.name,
    cellDiffs,
    columnDiffs,
    rowDiffs,
  }
}

function getCellDiffType(
  original: CellOriginal | undefined,
  modified: CellOriginal | undefined,
): DiffType {
  if (!original && !modified) return 'unchanged'
  if (!original && modified) return 'added'
  if (original && !modified) return 'removed'
  if (original && modified && original.value !== modified.value)
    return 'modified'
  return 'unchanged'
}

function createSheetAddedDiff(
  sheet: Sheet,
  startChangeIndex: number,
): SheetDiff {
  const cellDiffs = new Map<string, CellDiff>()
  const columnDiffs = new Map<string, ColumnDiff>()
  const rowDiffs = new Map<number, RowDiff>()
  let changeIndex = startChangeIndex

  // All columns are added
  for (const column of sheet.columns) {
    columnDiffs.set(column.id, {
      columnId: column.id,
      type: 'added',
      newHeader: column.header,
      newType: column.type,
      changeIndex: changeIndex++,
    })
  }

  // All cells are added
  for (const [cellRef, cell] of Array.from(sheet.cells)) {
    cellDiffs.set(cellRef, {
      cell: cellRef,
      type: 'added',
      newValue: cell.value === null ? undefined : cell.value,
      changeIndex: changeIndex++,
    })
  }

  return {
    name: sheet.name,
    cellDiffs,
    columnDiffs,
    rowDiffs,
  }
}

function createSheetRemovedDiff(
  sheet: Sheet,
  startChangeIndex: number,
): SheetDiff {
  const cellDiffs = new Map<string, CellDiff>()
  const columnDiffs = new Map<string, ColumnDiff>()
  const rowDiffs = new Map<number, RowDiff>()
  let changeIndex = startChangeIndex

  // All columns are removed
  for (const column of sheet.columns) {
    columnDiffs.set(column.id, {
      columnId: column.id,
      type: 'removed',
      oldHeader: column.header,
      oldType: column.type,
      changeIndex: changeIndex++,
    })
  }

  // All cells are removed
  for (const [cellRef, cell] of Array.from(sheet.cells)) {
    cellDiffs.set(cellRef, {
      cell: cellRef,
      type: 'removed',
      oldValue: cell.value === null ? undefined : cell.value,
      changeIndex: changeIndex++,
    })
  }

  return {
    name: sheet.name,
    cellDiffs,
    columnDiffs,
    rowDiffs,
  }
}

function countSheetChanges(sheetDiff: SheetDiff): number {
  return (
    sheetDiff.cellDiffs.size +
    sheetDiff.columnDiffs.size +
    sheetDiff.rowDiffs.size
  )
}
