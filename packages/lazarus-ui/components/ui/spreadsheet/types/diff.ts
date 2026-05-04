import type { CellOriginal, Column, SpreadsheetMeta } from '../types'

export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface SpreadsheetData {
  meta: SpreadsheetMeta
  sheets: Sheet[]
}

export interface Sheet {
  name: string
  columns: Column[]
  cells: Map<string, CellOriginal>
}

export interface CellDiff {
  cell: string // Cell reference (e.g., "A1")
  type: DiffType
  oldValue?: string | number | Date
  newValue?: string | number | Date
  changeIndex: number
}

export interface ColumnDiff {
  columnId: string
  type: 'added' | 'removed' | 'modified'
  oldHeader?: string
  newHeader?: string
  oldType?: string
  newType?: string
  changeIndex: number
}

export interface RowDiff {
  rowIndex: number
  type: 'added' | 'removed'
  changeIndex: number
}

export interface SheetDiff {
  name: string
  cellDiffs: Map<string, CellDiff>
  columnDiffs: Map<string, ColumnDiff>
  rowDiffs: Map<number, RowDiff>
}

export interface SpreadsheetDiff {
  sheets: Map<string, SheetDiff>
  totalChanges: number
}

export type DiffChangeStatus = 'pending' | 'accepted' | 'rejected'

export interface DiffChange {
  id: string
  type: 'cell' | 'column' | 'row'
  sheetName: string
  reference: string // Cell ref, column ID, or row index as string
  status: DiffChangeStatus
  diff: CellDiff | ColumnDiff | RowDiff
}
