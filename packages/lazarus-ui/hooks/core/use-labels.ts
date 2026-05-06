import { useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { useAddLabelToItem } from '@/hooks/features/labels/use-add-label-to-item'
import { useCreateLabel as useCreateLabelDB } from '@/hooks/features/labels/use-create-label'
import { useDeleteLabel as useDeleteLabelDB } from '@/hooks/features/labels/use-delete-label'
import { useGetLabels } from '@/hooks/features/labels/use-get-labels'
import { useRemoveLabelFromItem } from '@/hooks/features/labels/use-remove-label-from-item'
import { Item, ItemType } from '@/model/item'
import { ItemLabel, Label } from '@/model/label'
import { useStore } from '@/state/store'

/**
 * Hook for working with labels in the application
 * Provides functions for creating, updating, and applying labels to items
 * Integrates both local storage labels and database labels
 */
export function useLabels() {
  const {
    labels: localLabels,
    setLabels,
    itemLabels,
    setItemLabels,
    items,
    setItems,
    activeWorkspaceId,
  } = useStore()

  // Fetch labels from database for the current workspace
  const {
    labels: databaseLabels,
    loading: databaseLabelsLoading,
    refresh: refreshLabels,
  } = useGetLabels(activeWorkspaceId || '')

  // Database label creation hook
  const { createLabel: createLabelInDB } = useCreateLabelDB()

  // Database label deletion hook
  const [deleteLabelInDB] = useDeleteLabelDB()

  // Individual label operation hooks
  const [addLabelToItemInDB] = useAddLabelToItem()
  const [removeLabelFromItemInDB] = useRemoveLabelFromItem()

  // Merge local storage labels with database labels
  const allLabels = useMemo(() => {
    const merged: Record<string, Label> = { ...localLabels }

    // Add database labels, giving them priority over local labels with same ID
    if (Array.isArray(databaseLabels)) {
      databaseLabels.forEach((label: Label) => {
        merged[label.id] = label
      })
    }

    return merged
  }, [localLabels, databaseLabels])

  /**
   * Get all labels for the current workspace
   */
  const workspaceLabels = useMemo(() => {
    if (!activeWorkspaceId) return []

    return Object.values(allLabels)
      .filter((label) => label.workspaceId === activeWorkspaceId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allLabels, activeWorkspaceId])

  /**
   * Create a new label in the current workspace
   * Now creates labels in the database instead of just local storage
   */
  const createLabel = useCallback(
    async (
      name: string,
      color: string,
      description?: string,
    ): Promise<Label | null> => {
      if (!activeWorkspaceId) {
        throw new Error('No active workspace')
      }

      try {
        // Create label in database
        const label = await createLabelInDB({
          name,
          color,
          description,
        })

        if (label) {
          // Also add to local storage for immediate UI update
          setLabels((prev) => ({
            ...prev,
            [label.id]: label,
          }))
        }

        return label
      } catch (error) {
        console.error('Failed to create label:', error)
        return null
      }
    },
    [activeWorkspaceId, createLabelInDB, setLabels],
  )

  /**
   * Update an existing label
   */
  const updateLabel = useCallback(
    async (
      labelId: string,
      updates: Partial<Pick<Label, 'name' | 'color' | 'description'>>,
    ): Promise<boolean> => {
      const label = allLabels[labelId]
      if (!label) return false

      try {
        // Update in local state first
        setLabels((prev) => ({
          ...prev,
          [labelId]: {
            ...label,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        }))

        // TODO: Add database update when backend supports it
        // await updateLabelInDB({ labelId, ...updates })

        return true
      } catch (error) {
        console.error('Failed to update label:', error)
        // Rollback local changes on error
        setLabels((prev) => ({
          ...prev,
          [labelId]: label,
        }))
        return false
      }
    },
    [allLabels, setLabels],
  )

  /**
   * Delete a label and remove all its associations
   */
  const deleteLabel = useCallback(
    async (labelId: string): Promise<boolean> => {
      const label = allLabels[labelId]
      if (!label) return false

      try {
        // Only call the database deletion - let the mutation handle cache invalidation
        // and optimistic updates. No manual local state updates needed.
        await deleteLabelInDB({ labelId })
        return true
      } catch (error) {
        console.error('Failed to delete label:', error)
        return false
      }
    },
    [allLabels, deleteLabelInDB],
  )

  /**
   * Apply a label to an item
   */
  const labelItem = useCallback(
    async (
      itemId: string,
      labelId: string,
      itemType: string,
      labelData?: Partial<Label>,
    ): Promise<ItemLabel | null> => {
      try {
        const result = await addLabelToItemInDB({
          itemId,
          itemType: itemType as ItemType,
          labelId,
          labelData,
        })

        // Return a simple ItemLabel for compatibility
        return {
          id: uuidv4(),
          itemId,
          labelId,
          itemType,
          createdAt: new Date().toISOString(),
        }
      } catch (error) {
        console.error('Failed to add label:', error)
        return null
      }
    },
    [addLabelToItemInDB],
  )

  /**
   * Remove a label from an item
   */
  const unlabelItem = useCallback(
    async (
      itemId: string,
      labelId: string,
      itemType?: string,
    ): Promise<boolean> => {
      try {
        const result = await removeLabelFromItemInDB({
          itemId,
          itemType: (itemType as ItemType) || 'conversation',
          labelId,
        })

        return true
      } catch (error) {
        console.error('Failed to remove label:', error)
        return false
      }
    },
    [removeLabelFromItemInDB],
  )

  /**
   * Get all labels for a specific item
   */
  const getItemLabels = useCallback(
    (itemId: string): Label[] => {
      const item = items[itemId]
      if (!item || !item.labels || item.labels.length === 0) return []

      // labels is now already an array of Label objects
      return item.labels
    },
    [items],
  )

  /**
   * Get all items with a specific label
   */
  const getItemsByLabel = useCallback(
    (labelId: string): Item[] => {
      return Object.values(items).filter((item) =>
        item.labels?.some((label) => label.id === labelId),
      )
    },
    [items],
  )

  return {
    // Label data
    workspaceLabels,
    loading: databaseLabelsLoading,

    // Label operations
    createLabel,
    updateLabel,
    deleteLabel,

    // Item labeling operations
    labelItem,
    unlabelItem,
    getItemLabels,
    getItemsByLabel,
  }
}
