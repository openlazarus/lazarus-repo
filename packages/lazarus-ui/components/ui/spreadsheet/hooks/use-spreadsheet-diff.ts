import { useCallback, useMemo, useState } from 'react'

import { calculateSpreadsheetDiff } from '../utils/diff-calculator'

import type {
  CellDiff,
  ColumnDiff,
  DiffChange,
  DiffChangeStatus,
  RowDiff,
  SpreadsheetData,
} from '../types/diff'

interface UseSpreadsheetDiffProps {
  originalData: SpreadsheetData | null
  modifiedData: SpreadsheetData | null
  onAcceptChange?: (change: DiffChange) => void
  onRejectChange?: (change: DiffChange) => void
  onAcceptAll?: () => void
  onRejectAll?: () => void
}

export function useSpreadsheetDiff({
  originalData,
  modifiedData,
  onAcceptChange,
  onRejectChange,
  onAcceptAll,
  onRejectAll,
}: UseSpreadsheetDiffProps) {
  const [changeStatuses, setChangeStatuses] = useState<
    Map<string, DiffChangeStatus>
  >(new Map())

  // Calculate diff between original and modified data
  const diff = useMemo(() => {
    if (!originalData || !modifiedData) return null
    return calculateSpreadsheetDiff(originalData, modifiedData)
  }, [originalData, modifiedData])

  // Convert diff to flat list of changes for easier management
  const changes = useMemo(() => {
    if (!diff) return []

    const allChanges: DiffChange[] = []

    for (const [sheetName, sheetDiff] of Array.from(diff.sheets)) {
      // Add cell changes
      for (const [cellRef, cellDiff] of Array.from(sheetDiff.cellDiffs)) {
        allChanges.push({
          id: `${sheetName}-cell-${cellRef}`,
          type: 'cell',
          sheetName,
          reference: cellRef,
          status:
            changeStatuses.get(`${sheetName}-cell-${cellRef}`) || 'pending',
          diff: cellDiff,
        })
      }

      // Add column changes
      for (const [columnId, columnDiff] of Array.from(sheetDiff.columnDiffs)) {
        allChanges.push({
          id: `${sheetName}-column-${columnId}`,
          type: 'column',
          sheetName,
          reference: columnId,
          status:
            changeStatuses.get(`${sheetName}-column-${columnId}`) || 'pending',
          diff: columnDiff,
        })
      }

      // Add row changes
      for (const [rowIndex, rowDiff] of Array.from(sheetDiff.rowDiffs)) {
        allChanges.push({
          id: `${sheetName}-row-${rowIndex}`,
          type: 'row',
          sheetName,
          reference: rowIndex.toString(),
          status:
            changeStatuses.get(`${sheetName}-row-${rowIndex}`) || 'pending',
          diff: rowDiff,
        })
      }
    }

    return allChanges.sort((a, b) => {
      // Sort by changeIndex to maintain order
      const aIndex = (a.diff as any).changeIndex
      const bIndex = (b.diff as any).changeIndex
      return aIndex - bIndex
    })
  }, [diff, changeStatuses])

  const acceptChange = useCallback(
    (changeId: string) => {
      setChangeStatuses((prev) => {
        const next = new Map(prev)
        next.set(changeId, 'accepted')
        return next
      })

      const change = changes.find((c) => c.id === changeId)
      if (change && onAcceptChange) {
        onAcceptChange(change)
      }
    },
    [changes, onAcceptChange],
  )

  const rejectChange = useCallback(
    (changeId: string) => {
      setChangeStatuses((prev) => {
        const next = new Map(prev)
        next.set(changeId, 'rejected')
        return next
      })

      const change = changes.find((c) => c.id === changeId)
      if (change && onRejectChange) {
        onRejectChange(change)
      }
    },
    [changes, onRejectChange],
  )

  const acceptAllChanges = useCallback(() => {
    setChangeStatuses((prev) => {
      const next = new Map(prev)
      changes.forEach((change) => {
        if (change.status === 'pending') {
          next.set(change.id, 'accepted')
        }
      })
      return next
    })

    if (onAcceptAll) {
      onAcceptAll()
    }
  }, [changes, onAcceptAll])

  const rejectAllChanges = useCallback(() => {
    setChangeStatuses((prev) => {
      const next = new Map(prev)
      changes.forEach((change) => {
        if (change.status === 'pending') {
          next.set(change.id, 'rejected')
        }
      })
      return next
    })

    if (onRejectAll) {
      onRejectAll()
    }
  }, [changes, onRejectAll])

  const getCellDiff = useCallback(
    (sheetName: string, cellRef: string): CellDiff | null => {
      if (!diff) return null
      const sheetDiff = diff.sheets.get(sheetName)
      if (!sheetDiff) return null
      return sheetDiff.cellDiffs.get(cellRef) || null
    },
    [diff],
  )

  const getColumnDiff = useCallback(
    (sheetName: string, columnId: string): ColumnDiff | null => {
      if (!diff) return null
      const sheetDiff = diff.sheets.get(sheetName)
      if (!sheetDiff) return null
      return sheetDiff.columnDiffs.get(columnId) || null
    },
    [diff],
  )

  const getRowDiff = useCallback(
    (sheetName: string, rowIndex: number): RowDiff | null => {
      if (!diff) return null
      const sheetDiff = diff.sheets.get(sheetName)
      if (!sheetDiff) return null
      return sheetDiff.rowDiffs.get(rowIndex) || null
    },
    [diff],
  )

  const getChangeStatus = useCallback(
    (changeId: string): DiffChangeStatus => {
      return changeStatuses.get(changeId) || 'pending'
    },
    [changeStatuses],
  )

  const pendingChangesCount = useMemo(() => {
    return changes.filter((c) => c.status === 'pending').length
  }, [changes])

  const acceptedChangesCount = useMemo(() => {
    return changes.filter((c) => c.status === 'accepted').length
  }, [changes])

  const rejectedChangesCount = useMemo(() => {
    return changes.filter((c) => c.status === 'rejected').length
  }, [changes])

  return {
    diff,
    changes,
    acceptChange,
    rejectChange,
    acceptAllChanges,
    rejectAllChanges,
    getCellDiff,
    getColumnDiff,
    getRowDiff,
    getChangeStatus,
    pendingChangesCount,
    acceptedChangesCount,
    rejectedChangesCount,
    totalChangesCount: diff?.totalChanges || 0,
  }
}
