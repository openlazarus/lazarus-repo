import yaml from 'js-yaml'
import { nanoid } from 'nanoid'

import {
  ColumnContent,
  Content,
  GridLayout,
  LayoutType,
  PresentationData,
  Slide,
} from './types'
import { validatePresentation } from './validator'

export class ParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParseError'
  }
}

export function parsePresentation(yamlContent: string): PresentationData {
  try {
    // Parse YAML
    const rawData = yaml.load(yamlContent) as any

    if (!rawData || typeof rawData !== 'object') {
      throw new ParseError('Invalid YAML document')
    }

    if (!rawData.presentation) {
      throw new ParseError('Document must have a "presentation" root key')
    }

    const presentation = rawData.presentation

    // Extract and validate meta
    if (!presentation.meta) {
      throw new ParseError('Presentation must have a "meta" section')
    }

    if (!presentation.meta.title) {
      throw new ParseError('Presentation meta must have a title')
    }

    // Extract slides
    if (!presentation.slides || !Array.isArray(presentation.slides)) {
      throw new ParseError('Presentation must have a "slides" array')
    }

    // Process slides
    const processedSlides = presentation.slides.map(
      (slide: any, index: number) => {
        return processSlide(slide, index)
      },
    )

    // Construct presentation data
    const presentationData: PresentationData = {
      meta: {
        title: presentation.meta.title,
        author: presentation.meta.author,
        date: presentation.meta.date,
        theme: presentation.meta.theme || 'minimal',
        aspectRatio: presentation.meta.aspectRatio || '16:9',
        logo: presentation.meta.logo,
      },
      defaults: presentation.defaults || {},
      slides: processedSlides,
    }

    // Validate the processed data
    const validation = validatePresentation(presentationData)
    if (!validation.valid) {
      throw new ParseError(`Validation failed: ${validation.errors.join(', ')}`)
    }

    return presentationData
  } catch (error) {
    if (error instanceof ParseError) {
      throw error
    }
    if (error instanceof yaml.YAMLException) {
      throw new ParseError(`YAML syntax error: ${error.message}`)
    }
    throw new ParseError(`Failed to parse presentation: ${error}`)
  }
}

function processSlide(slide: any, index: number): Slide {
  if (!slide.type) {
    throw new ParseError(`Slide at index ${index} must have a type`)
  }

  const processedSlide: Slide = {
    id: slide.id || nanoid(),
    type: slide.type,
    title: slide.title,
    subtitle: slide.subtitle,
    background: slide.background,
    transition: slide.transition,
    notes: slide.notes,
    duration: slide.duration,
  }

  // Process layout
  if (slide.layout) {
    if (typeof slide.layout === 'string') {
      processedSlide.layout = slide.layout as LayoutType
    } else if (slide.layout.type === 'grid') {
      processedSlide.layout = slide.layout as GridLayout
    }
  }

  // Process content based on slide type
  switch (slide.type) {
    case 'title':
      if (slide.content) {
        processedSlide.content = processContentArray(slide.content)
      }
      break

    case 'content':
      if (slide.content) {
        if (Array.isArray(slide.content)) {
          processedSlide.content = processContentArray(slide.content)
        } else if (typeof slide.content === 'object') {
          // Column-based content
          processedSlide.content = processColumnContent(slide.content)
        }
      }
      break

    case 'code':
      if (!slide.language && !slide.content) {
        throw new ParseError(
          `Code slide at index ${index} must have language and content`,
        )
      }
      processedSlide.language = slide.language
      processedSlide.highlight = slide.highlight
      processedSlide.executable = slide.executable
      processedSlide.output = slide.output
      if (slide.content) {
        processedSlide.content = [
          {
            type: 'code',
            value: slide.content,
            language: slide.language,
            highlight: slide.highlight,
          },
        ]
      }
      break

    case 'diagram':
      if (!slide.content) {
        throw new ParseError(
          `Diagram slide at index ${index} must have content`,
        )
      }
      processedSlide.content = [
        {
          type: 'text',
          value: slide.content,
        },
      ]
      break

    case 'comparison':
      if (!slide.items || !Array.isArray(slide.items)) {
        throw new ParseError(
          `Comparison slide at index ${index} must have items array`,
        )
      }
      processedSlide.items = slide.items
      break

    // New slide types
    case 'data-viz':
    case 'table':
      processedSlide.data = slide.data
      break

    case 'metrics':
      processedSlide.metrics = slide.metrics
      break

    case 'timeline':
      processedSlide.events = slide.events
      break

    case 'team':
      processedSlide.members = slide.members
      break

    case 'testimonial':
      processedSlide.testimonials = slide.testimonials
      break

    case 'gallery':
      processedSlide.images = slide.images
      break

    case 'process':
      processedSlide.steps = slide.steps
      break

    case 'agenda':
      processedSlide.sections = slide.sections
      break

    case 'summary':
      processedSlide.highlights = slide.highlights
      break
  }

  return processedSlide
}

function processContentArray(content: any[]): Content[] {
  return content.map((item, index) => {
    if (!item.type) {
      throw new ParseError(`Content item at index ${index} must have a type`)
    }

    const processedContent: Content = {
      type: item.type,
      value: item.value,
      items: item.items,
      src: item.src,
      alt: item.alt,
      style: item.style,
      animation: item.animation,
      language: item.language,
      highlight: item.highlight,
      icon: item.icon,
      description: item.description,
      text: item.text,
      author: item.author,
      url: item.url,
    }

    // Clean up undefined properties
    Object.keys(processedContent).forEach((key) => {
      if (processedContent[key as keyof Content] === undefined) {
        delete processedContent[key as keyof Content]
      }
    })

    return processedContent
  })
}

function processColumnContent(content: any): ColumnContent {
  const columns: ColumnContent = {}

  Object.keys(content).forEach((key) => {
    if (Array.isArray(content[key])) {
      columns[key] = processContentArray(content[key])
    }
  })

  return columns
}

// Export utility to convert presentation back to YAML
export function presentationToYAML(presentation: PresentationData): string {
  const yamlData = {
    presentation: {
      meta: presentation.meta,
      ...(presentation.defaults && { defaults: presentation.defaults }),
      slides: presentation.slides.map((slide) => {
        const { id, ...slideWithoutId } = slide
        return slideWithoutId
      }),
    },
  }

  return yaml.dump(yamlData, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  })
}
