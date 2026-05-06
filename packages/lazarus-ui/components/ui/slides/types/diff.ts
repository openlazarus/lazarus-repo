export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged'
export type ChangeType = 'content' | 'style' | 'layout' | 'metadata' | 'reorder'

export interface SlideChange {
  path: string // e.g., "title", "content[0].text", "layout"
  type: DiffType
  changeType: ChangeType
  oldValue?: any
  newValue?: any
  description?: string // Human-readable description of the change
}

export interface SlideDiff {
  slideId?: string
  originalIndex?: number
  modifiedIndex?: number
  type: 'added' | 'removed' | 'modified' | 'reordered'
  changes: SlideChange[]
  similarity?: number // 0-1 score for matching slides
}

export interface PresentationDiff {
  meta: {
    changes: SlideChange[]
    hasChanges: boolean
  }
  slides: SlideDiff[]
  totalChanges: number
  changesByType: Record<ChangeType, number>
  timeline: DiffTimelineEntry[]
}

export interface DiffTimelineEntry {
  id: string
  timestamp: number
  slideIndex?: number
  change: SlideChange
  slideDiff?: SlideDiff
}

export interface DiffViewState {
  showDiff: boolean
  currentChangeIndex: number
  filteredTypes: ChangeType[]
  viewMode: 'overlay' | 'timeline' | 'split'
  highlightedChanges: Set<string>
}

export interface DiffNavigationState {
  isPlaying: boolean
  playbackSpeed: number // 1x, 2x, etc.
  currentTimestamp: number
}

// Helper type for deep comparison
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Type for tracking slide movements
export interface SlideMovement {
  fromIndex: number
  toIndex: number
  slideId?: string
}

// Type for diff statistics
export interface DiffStatistics {
  slidesAdded: number
  slidesRemoved: number
  slidesModified: number
  slidesReordered: number
  contentChanges: number
  styleChanges: number
  layoutChanges: number
  metadataChanges: number
}
