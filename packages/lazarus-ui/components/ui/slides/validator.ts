import {
  AspectRatio,
  ColumnContent,
  Content,
  ContentType,
  LayoutType,
  PresentationData,
  Slide,
  SlideType,
  ThemeName,
  TransitionType,
} from './types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

const VALID_SLIDE_TYPES: SlideType[] = [
  'title',
  'content',
  'code',
  'diagram',
  'comparison',
  'data-viz',
  'table',
  'metrics',
  'timeline',
  'team',
  'testimonial',
  'gallery',
  'process',
  'agenda',
  'summary',
]
const VALID_CONTENT_TYPES: ContentType[] = [
  'text',
  'list',
  'image',
  'code',
  'quote',
  'video',
  'feature',
  'buttons',
]
const VALID_THEMES: ThemeName[] = [
  'minimal',
  'dark',
  'keynote',
  'code',
  'paper',
  'custom',
]
const VALID_ASPECT_RATIOS: AspectRatio[] = ['16:9', '4:3', '1:1']
const VALID_TRANSITIONS: TransitionType[] = [
  'fade',
  'slide',
  'none',
  'magic-move',
]
const VALID_LAYOUTS: LayoutType[] = ['single', 'two-column', 'grid']

export function validatePresentation(data: PresentationData): ValidationResult {
  const errors: string[] = []

  // Validate meta
  if (!data.meta) {
    errors.push('Presentation must have meta information')
  } else {
    if (!data.meta.title) {
      errors.push('Presentation meta must have a title')
    }

    if (data.meta.theme && !VALID_THEMES.includes(data.meta.theme)) {
      errors.push(
        `Invalid theme: ${data.meta.theme}. Valid themes are: ${VALID_THEMES.join(', ')}`,
      )
    }

    if (
      data.meta.aspectRatio &&
      !VALID_ASPECT_RATIOS.includes(data.meta.aspectRatio)
    ) {
      errors.push(
        `Invalid aspect ratio: ${data.meta.aspectRatio}. Valid ratios are: ${VALID_ASPECT_RATIOS.join(', ')}`,
      )
    }
  }

  // Validate defaults
  if (data.defaults) {
    if (
      data.defaults.transition &&
      !VALID_TRANSITIONS.includes(data.defaults.transition)
    ) {
      errors.push(`Invalid default transition: ${data.defaults.transition}`)
    }

    if (
      data.defaults.duration !== undefined &&
      (typeof data.defaults.duration !== 'number' ||
        data.defaults.duration <= 0)
    ) {
      errors.push('Default duration must be a positive number')
    }
  }

  // Validate slides
  if (!data.slides || !Array.isArray(data.slides)) {
    errors.push('Presentation must have a slides array')
  } else if (data.slides.length === 0) {
    errors.push('Presentation must have at least one slide')
  } else {
    data.slides.forEach((slide, index) => {
      const slideErrors = validateSlide(slide, index)
      errors.push(...slideErrors)
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function validateSlide(slide: Slide, index: number): string[] {
  const errors: string[] = []
  const prefix = `Slide ${index + 1}`

  // Validate type
  if (!slide.type) {
    errors.push(`${prefix}: Missing type`)
  } else if (!VALID_SLIDE_TYPES.includes(slide.type)) {
    errors.push(
      `${prefix}: Invalid type '${slide.type}'. Valid types are: ${VALID_SLIDE_TYPES.join(', ')}`,
    )
  }

  // Validate layout
  if (slide.layout) {
    if (
      typeof slide.layout === 'string' &&
      !VALID_LAYOUTS.includes(slide.layout)
    ) {
      errors.push(`${prefix}: Invalid layout '${slide.layout}'`)
    } else if (
      typeof slide.layout === 'object' &&
      slide.layout.type === 'grid'
    ) {
      if (
        !slide.layout.columns ||
        typeof slide.layout.columns !== 'number' ||
        slide.layout.columns < 1
      ) {
        errors.push(
          `${prefix}: Grid layout must have a positive number of columns`,
        )
      }
    }
  }

  // Validate transition
  if (slide.transition && !VALID_TRANSITIONS.includes(slide.transition)) {
    errors.push(`${prefix}: Invalid transition '${slide.transition}'`)
  }

  // Type-specific validation
  switch (slide.type) {
    case 'title':
      if (!slide.title && !slide.subtitle) {
        errors.push(`${prefix}: Title slide must have either title or subtitle`)
      }
      break

    case 'code':
      if (
        !slide.language &&
        (!slide.content ||
          !Array.isArray(slide.content) ||
          slide.content.length === 0)
      ) {
        errors.push(`${prefix}: Code slide must have language or content`)
      }
      if (slide.highlight) {
        if (Array.isArray(slide.highlight)) {
          if (!slide.highlight.every((n) => typeof n === 'number' && n > 0)) {
            errors.push(
              `${prefix}: Highlight array must contain positive numbers`,
            )
          }
        }
      }
      break

    case 'diagram':
      if (
        !slide.content ||
        (Array.isArray(slide.content) && slide.content.length === 0)
      ) {
        errors.push(`${prefix}: Diagram slide must have content`)
      }
      break

    case 'comparison':
      if (
        !slide.items ||
        !Array.isArray(slide.items) ||
        slide.items.length === 0
      ) {
        errors.push(`${prefix}: Comparison slide must have items`)
      } else {
        slide.items.forEach((item, itemIndex) => {
          const keys = Object.keys(item)
          if (keys.length === 0) {
            errors.push(`${prefix}: Comparison item ${itemIndex + 1} is empty`)
          }
          keys.forEach((key) => {
            if (!item[key].title || !item[key].points) {
              errors.push(
                `${prefix}: Comparison item '${key}' must have title and points`,
              )
            }
          })
        })
      }
      break

    // New slide type validations
    case 'data-viz':
      if (!slide.data) {
        errors.push(`${prefix}: Data visualization slide must have data`)
      } else {
        const chartData = slide.data as any
        if (!chartData.type) {
          errors.push(`${prefix}: Data visualization must have a chart type`)
        }
        if (!chartData.datasets || !Array.isArray(chartData.datasets)) {
          errors.push(`${prefix}: Data visualization must have datasets`)
        }
      }
      break

    case 'table':
      if (!slide.data) {
        errors.push(`${prefix}: Table slide must have data`)
      } else {
        const tableData = slide.data as any
        if (!tableData.headers || !Array.isArray(tableData.headers)) {
          errors.push(`${prefix}: Table must have headers`)
        }
        if (!tableData.rows || !Array.isArray(tableData.rows)) {
          errors.push(`${prefix}: Table must have rows`)
        }
      }
      break

    case 'metrics':
      if (
        !slide.metrics ||
        !Array.isArray(slide.metrics) ||
        slide.metrics.length === 0
      ) {
        errors.push(`${prefix}: Metrics slide must have metrics array`)
      }
      break

    case 'timeline':
      if (
        !slide.events ||
        !Array.isArray(slide.events) ||
        slide.events.length === 0
      ) {
        errors.push(`${prefix}: Timeline slide must have events array`)
      }
      break

    case 'team':
      if (
        !slide.members ||
        !Array.isArray(slide.members) ||
        slide.members.length === 0
      ) {
        errors.push(`${prefix}: Team slide must have members array`)
      }
      break

    case 'testimonial':
      if (
        !slide.testimonials ||
        !Array.isArray(slide.testimonials) ||
        slide.testimonials.length === 0
      ) {
        errors.push(`${prefix}: Testimonial slide must have testimonials array`)
      }
      break

    case 'gallery':
      if (
        !slide.images ||
        !Array.isArray(slide.images) ||
        slide.images.length === 0
      ) {
        errors.push(`${prefix}: Gallery slide must have images array`)
      }
      break

    case 'process':
      if (
        !slide.steps ||
        !Array.isArray(slide.steps) ||
        slide.steps.length === 0
      ) {
        errors.push(`${prefix}: Process slide must have steps array`)
      }
      break

    case 'agenda':
      if (
        !slide.sections ||
        !Array.isArray(slide.sections) ||
        slide.sections.length === 0
      ) {
        errors.push(`${prefix}: Agenda slide must have sections array`)
      }
      break

    case 'summary':
      if (
        !slide.highlights ||
        !Array.isArray(slide.highlights) ||
        slide.highlights.length === 0
      ) {
        errors.push(`${prefix}: Summary slide must have highlights array`)
      }
      break
  }

  // Validate content
  if (slide.content) {
    if (Array.isArray(slide.content)) {
      slide.content.forEach((content, contentIndex) => {
        const contentErrors = validateContent(
          content,
          `${prefix} content ${contentIndex + 1}`,
        )
        errors.push(...contentErrors)
      })
    } else if (typeof slide.content === 'object') {
      // Column content
      const columnContent = slide.content as ColumnContent
      Object.keys(columnContent).forEach((column) => {
        const columnItems = columnContent[column]
        if (Array.isArray(columnItems)) {
          columnItems.forEach((content, contentIndex) => {
            const contentErrors = validateContent(
              content,
              `${prefix} ${column} content ${contentIndex + 1}`,
            )
            errors.push(...contentErrors)
          })
        }
      })
    }
  }

  return errors
}

function validateContent(content: Content, prefix: string): string[] {
  const errors: string[] = []

  if (!content.type) {
    errors.push(`${prefix}: Missing type`)
  } else if (!VALID_CONTENT_TYPES.includes(content.type)) {
    errors.push(`${prefix}: Invalid type '${content.type}'`)
  }

  // Type-specific validation
  switch (content.type) {
    case 'text':
      if (!content.value) {
        errors.push(`${prefix}: Text content must have value`)
      }
      break

    case 'list':
      if (
        !content.items ||
        !Array.isArray(content.items) ||
        content.items.length === 0
      ) {
        errors.push(`${prefix}: List content must have items`)
      }
      break

    case 'image':
    case 'video':
      if (!content.src) {
        errors.push(`${prefix}: ${content.type} content must have src`)
      }
      break

    case 'code':
      if (!content.value) {
        errors.push(`${prefix}: Code content must have value`)
      }
      break

    case 'quote':
      if (!content.text) {
        errors.push(`${prefix}: Quote content must have text`)
      }
      break

    case 'feature':
      if (!content.icon || !content.description) {
        errors.push(`${prefix}: Feature content must have icon and description`)
      }
      break

    case 'buttons':
      if (!content.items || !Array.isArray(content.items)) {
        errors.push(`${prefix}: Buttons content must have items array`)
      }
      break
  }

  return errors
}
