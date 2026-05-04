import type {
  Content,
  PresentationData,
  PresentationMeta,
  Slide,
} from '../types'
import type {
  ChangeType,
  DiffTimelineEntry,
  PresentationDiff,
  SlideChange,
  SlideDiff,
  SlideMovement,
} from '../types/diff'

export function calculatePresentationDiff(
  original: PresentationData,
  modified: PresentationData,
): PresentationDiff {
  const timeline: DiffTimelineEntry[] = []
  let timestamp = 0

  // Calculate metadata changes
  const metaChanges = calculateMetaChanges(original.meta, modified.meta)
  metaChanges.forEach((change) => {
    timeline.push({
      id: `meta-${timestamp}`,
      timestamp: timestamp++,
      change,
    })
  })

  // Calculate slide changes
  const slideDiffs = calculateSlideDiffs(original.slides, modified.slides)

  // Add slide changes to timeline
  slideDiffs.forEach((slideDiff, index) => {
    slideDiff.changes.forEach((change) => {
      timeline.push({
        id: `slide-${index}-${timestamp}`,
        timestamp: timestamp++,
        slideIndex: slideDiff.modifiedIndex ?? slideDiff.originalIndex,
        change,
        slideDiff,
      })
    })
  })

  // Calculate statistics
  const changesByType = timeline.reduce(
    (acc, entry) => {
      const type = entry.change.changeType
      acc[type] = (acc[type] || 0) + 1
      return acc
    },
    {} as Record<ChangeType, number>,
  )

  return {
    meta: {
      changes: metaChanges,
      hasChanges: metaChanges.length > 0,
    },
    slides: slideDiffs,
    totalChanges: timeline.length,
    changesByType,
    timeline,
  }
}

function calculateMetaChanges(
  original: PresentationMeta,
  modified: PresentationMeta,
): SlideChange[] {
  const changes: SlideChange[] = []

  // Check each meta field
  const fields: (keyof PresentationMeta)[] = [
    'title',
    'author',
    'date',
    'theme',
    'aspectRatio',
    'logo',
  ]

  fields.forEach((field) => {
    if (original[field] !== modified[field]) {
      changes.push({
        path: `meta.${field}`,
        type: 'modified',
        changeType: 'metadata',
        oldValue: original[field],
        newValue: modified[field],
        description: `${field} changed from "${original[field]}" to "${modified[field]}"`,
      })
    }
  })

  return changes
}

function calculateSlideDiffs(
  originalSlides: Slide[],
  modifiedSlides: Slide[],
): SlideDiff[] {
  const diffs: SlideDiff[] = []

  // Create maps for efficient lookup
  const originalMap = new Map(
    originalSlides.map((slide, index) => [
      slide.id || `index-${index}`,
      { slide, index },
    ]),
  )
  const modifiedMap = new Map(
    modifiedSlides.map((slide, index) => [
      slide.id || `index-${index}`,
      { slide, index },
    ]),
  )

  // Find removed slides
  originalSlides.forEach((slide, index) => {
    const slideId = slide.id || `index-${index}`
    if (!modifiedMap.has(slideId)) {
      diffs.push({
        slideId,
        originalIndex: index,
        type: 'removed',
        changes: [
          {
            path: 'slide',
            type: 'removed',
            changeType: 'content',
            oldValue: slide,
            description: `Slide "${slide.title || 'Untitled'}" removed`,
          },
        ],
      })
    }
  })

  // Find added and modified slides
  modifiedSlides.forEach((slide, index) => {
    const slideId = slide.id || `index-${index}`
    const original = originalMap.get(slideId)

    if (!original) {
      // Slide added
      diffs.push({
        slideId,
        modifiedIndex: index,
        type: 'added',
        changes: [
          {
            path: 'slide',
            type: 'added',
            changeType: 'content',
            newValue: slide,
            description: `Slide "${slide.title || 'Untitled'}" added`,
          },
        ],
      })
    } else {
      // Check if slide was modified or reordered
      const changes = compareSlides(original.slide, slide)
      const wasReordered = original.index !== index

      if (changes.length > 0 || wasReordered) {
        const diff: SlideDiff = {
          slideId,
          originalIndex: original.index,
          modifiedIndex: index,
          type: wasReordered && changes.length === 0 ? 'reordered' : 'modified',
          changes: changes,
          similarity: calculateSlideSimilarity(original.slide, slide),
        }

        if (wasReordered) {
          diff.changes.push({
            path: 'position',
            type: 'modified',
            changeType: 'reorder',
            oldValue: original.index,
            newValue: index,
            description: `Slide moved from position ${original.index + 1} to ${index + 1}`,
          })
        }

        diffs.push(diff)
      }
    }
  })

  return diffs.sort((a, b) => {
    // Sort by modified index, then original index
    const aIndex = a.modifiedIndex ?? a.originalIndex ?? 0
    const bIndex = b.modifiedIndex ?? b.originalIndex ?? 0
    return aIndex - bIndex
  })
}

function compareSlides(original: Slide, modified: Slide): SlideChange[] {
  const changes: SlideChange[] = []

  // Compare basic properties
  const basicProps: (keyof Slide)[] = [
    'type',
    'title',
    'subtitle',
    'layout',
    'background',
    'transition',
    'notes',
    'duration',
    'language',
  ]

  basicProps.forEach((prop) => {
    if (JSON.stringify(original[prop]) !== JSON.stringify(modified[prop])) {
      changes.push({
        path: prop,
        type: 'modified',
        changeType:
          prop === 'layout' || prop === 'transition'
            ? 'layout'
            : prop === 'background'
              ? 'style'
              : 'content',
        oldValue: original[prop],
        newValue: modified[prop],
        description: `${prop} changed`,
      })
    }
  })

  // Compare content
  if (original.content || modified.content) {
    const contentChanges = compareContent(original.content, modified.content)
    changes.push(...contentChanges)
  }

  // Compare type-specific properties
  const typeSpecificChanges = compareTypeSpecificProps(original, modified)
  changes.push(...typeSpecificChanges)

  return changes
}

function compareContent(
  original: Content[] | any,
  modified: Content[] | any,
): SlideChange[] {
  const changes: SlideChange[] = []

  // Handle different content structures
  if (Array.isArray(original) && Array.isArray(modified)) {
    // Compare array content
    const maxLength = Math.max(original.length, modified.length)

    for (let i = 0; i < maxLength; i++) {
      if (i >= original.length) {
        changes.push({
          path: `content[${i}]`,
          type: 'added',
          changeType: 'content',
          newValue: modified[i],
          description: `Content block ${i + 1} added`,
        })
      } else if (i >= modified.length) {
        changes.push({
          path: `content[${i}]`,
          type: 'removed',
          changeType: 'content',
          oldValue: original[i],
          description: `Content block ${i + 1} removed`,
        })
      } else if (JSON.stringify(original[i]) !== JSON.stringify(modified[i])) {
        changes.push({
          path: `content[${i}]`,
          type: 'modified',
          changeType: 'content',
          oldValue: original[i],
          newValue: modified[i],
          description: `Content block ${i + 1} modified`,
        })
      }
    }
  } else if (JSON.stringify(original) !== JSON.stringify(modified)) {
    changes.push({
      path: 'content',
      type: 'modified',
      changeType: 'content',
      oldValue: original,
      newValue: modified,
      description: 'Content structure changed',
    })
  }

  return changes
}

function compareTypeSpecificProps(
  original: Slide,
  modified: Slide,
): SlideChange[] {
  const changes: SlideChange[] = []

  // Type-specific property groups
  const typeProps: Record<string, string[]> = {
    code: ['highlight', 'executable', 'output'],
    comparison: ['items'],
    'data-viz': ['data'],
    table: ['data'],
    metrics: ['metrics'],
    timeline: ['events'],
    team: ['members'],
    testimonial: ['testimonials'],
    gallery: ['images'],
    process: ['steps'],
    agenda: ['sections'],
    summary: ['highlights'],
  }

  const props = typeProps[original.type] || []

  props.forEach((prop) => {
    const propKey = prop as keyof Slide
    if (
      JSON.stringify(original[propKey]) !== JSON.stringify(modified[propKey])
    ) {
      changes.push({
        path: prop,
        type: 'modified',
        changeType: 'content',
        oldValue: original[propKey],
        newValue: modified[propKey],
        description: `${prop} changed`,
      })
    }
  })

  return changes
}

function calculateSlideSimilarity(original: Slide, modified: Slide): number {
  let score = 0
  let totalWeight = 0

  // Weight different aspects
  const weights = {
    type: 0.3,
    title: 0.2,
    content: 0.3,
    layout: 0.1,
    other: 0.1,
  }

  // Compare type
  if (original.type === modified.type) {
    score += weights.type
  }
  totalWeight += weights.type

  // Compare title
  if (original.title === modified.title) {
    score += weights.title
  } else if (original.title && modified.title) {
    // Partial credit for similar titles
    const similarity = stringSimilarity(original.title, modified.title)
    score += weights.title * similarity
  }
  totalWeight += weights.title

  // Compare content structure
  if (JSON.stringify(original.content) === JSON.stringify(modified.content)) {
    score += weights.content
  }
  totalWeight += weights.content

  // Compare layout
  if (original.layout === modified.layout) {
    score += weights.layout
  }
  totalWeight += weights.layout

  return totalWeight > 0 ? score / totalWeight : 0
}

function stringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

// Helper function to detect slide movements
export function detectSlideMovements(
  originalSlides: Slide[],
  modifiedSlides: Slide[],
): SlideMovement[] {
  const movements: SlideMovement[] = []

  originalSlides.forEach((slide, originalIndex) => {
    const slideId = slide.id || slide.title || `slide-${originalIndex}`
    const modifiedIndex = modifiedSlides.findIndex(
      (s) => (s.id || s.title || `slide-${modifiedIndex}`) === slideId,
    )

    if (modifiedIndex !== -1 && modifiedIndex !== originalIndex) {
      movements.push({
        fromIndex: originalIndex,
        toIndex: modifiedIndex,
        slideId,
      })
    }
  })

  return movements
}
