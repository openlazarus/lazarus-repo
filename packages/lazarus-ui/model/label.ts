/**
 * Label model
 * Represents a user-defined label that can be applied to items
 * Items store label references as a TEXT[] array of label IDs
 */
export interface Label {
  id: string
  name: string
  color: string
  workspaceId: string
  description?: string
  createdAt: string
  updatedAt: string
}

/**
 * ItemLabel model
 * Represents the association between an item and a label
 * Based on the item_labels table in the database schema
 */
export interface ItemLabel {
  id: string
  itemId: string
  labelId: string
  itemType: string
  createdAt: string
}
