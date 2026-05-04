// Slides Type Definitions

export type ThemeName =
  | 'minimal'
  | 'dark'
  | 'keynote'
  | 'code'
  | 'paper'
  | 'custom'
export type AspectRatio = '16:9' | '4:3' | '1:1'
export type TransitionType = 'fade' | 'slide' | 'none' | 'magic-move'
export type SlideType =
  | 'title'
  | 'content'
  | 'code'
  | 'diagram'
  | 'comparison'
  | 'data-viz'
  | 'table'
  | 'metrics'
  | 'timeline'
  | 'team'
  | 'testimonial'
  | 'gallery'
  | 'process'
  | 'agenda'
  | 'summary'
export type LayoutType = 'single' | 'two-column' | 'grid'
export type ContentType =
  | 'text'
  | 'list'
  | 'image'
  | 'code'
  | 'quote'
  | 'video'
  | 'feature'
  | 'buttons'

export interface PresentationData {
  meta: PresentationMeta
  defaults?: PresentationDefaults
  slides: Slide[]
}

export interface PresentationMeta {
  title: string
  author?: string
  date?: string | Date
  theme?: ThemeName
  aspectRatio?: AspectRatio
  logo?: string
}

export interface PresentationDefaults {
  transition?: TransitionType
  duration?: number // seconds
  codeTheme?: 'light' | 'dark' | 'auto'
}

export interface Slide {
  id?: string
  type: SlideType
  title?: string
  subtitle?: string
  layout?: LayoutType | GridLayout
  content?: Content[] | ColumnContent
  background?: Background
  transition?: TransitionType
  notes?: string
  duration?: number // suggested duration in seconds

  // Type-specific properties
  language?: string // for code slides
  highlight?: number[] | string // for code slides
  executable?: boolean // for code slides
  output?: CodeOutput // for code slides
  items?: ComparisonItem[] // for comparison slides

  // New type-specific properties
  data?: ChartData | TableData // for data-viz and table slides
  metrics?: MetricItem[] // for metrics slides
  events?: TimelineEvent[] // for timeline slides
  members?: TeamMember[] // for team slides
  testimonials?: Testimonial[] // for testimonial slides
  images?: GalleryImage[] // for gallery slides
  steps?: ProcessStep[] // for process slides
  sections?: AgendaSection[] // for agenda slides
  highlights?: string[] // for summary slides
}

export interface GridLayout {
  type: 'grid'
  columns: number
  gap?: 'small' | 'medium' | 'large'
}

export interface ColumnContent {
  left?: Content[]
  right?: Content[]
  [key: string]: Content[] | undefined
}

export interface Content {
  type: ContentType
  value?: string
  items?: string[] | ListItem[]
  src?: string // for images/videos
  alt?: string // for images
  style?: ContentStyle
  animation?: Animation

  // Type-specific properties
  language?: string // for code blocks
  highlight?: number[] | string // for code blocks
  icon?: string // for features
  description?: string // for features
  text?: string // for quotes/buttons
  author?: string // for quotes
  url?: string // for buttons
}

export interface ListItem {
  text: string
  subItems?: string[]
}

export interface ContentStyle {
  size?: 'small' | 'medium' | 'large'
  align?: 'left' | 'center' | 'right'
  color?: string
  fontWeight?: 'normal' | 'medium' | 'bold'
  bullets?: 'disc' | 'circle' | 'square' | 'none' | 'numbers'
}

export interface Background {
  type?: 'color' | 'gradient' | 'image' | 'video'
  value?: string
  opacity?: number
  blur?: number
}

export interface Animation {
  trigger: 'auto' | 'click' | 'key'
  effect: AnimationEffect
  duration?: number // milliseconds
  delay?: number // milliseconds
  easing?: string
  sequence?: 'all' | 'sequential'
}

export interface AnimationEffect {
  name: string
  from?: Record<string, any>
  to?: Record<string, any>
}

export interface CodeOutput {
  show: boolean
  height?: number
  type?: 'console' | 'render' | 'both'
}

export interface ComparisonItem {
  [key: string]: {
    title: string
    points: string[]
    icon?: string
  }
}

export interface Theme {
  name: string
  colors: ThemeColors
  typography: ThemeTypography
  spacing: ThemeSpacing
  animations: ThemeAnimations
  components?: ThemeComponents
}

export interface ThemeColors {
  background: string
  text: string
  primary: string
  secondary: string
  accent: string
  muted: string
  border: string
  code: {
    background: string
    text: string
    comment: string
    keyword: string
    string: string
    number: string
    function: string
  }
  gradients: {
    purple: string
    blue: string
    dark: string
    light: string
  }
}

export interface ThemeTypography {
  fontFamily: {
    sans: string
    mono: string
  }
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
    '4xl': string
    '5xl': string
  }
  fontWeight: {
    normal: number
    medium: number
    semibold: number
    bold: number
  }
  lineHeight: {
    tight: number
    normal: number
    relaxed: number
  }
}

export interface ThemeSpacing {
  slide: {
    padding: string
    gap: string
  }
  content: {
    gap: string
  }
  grid: {
    gap: {
      small: string
      medium: string
      large: string
    }
  }
}

export interface ThemeAnimations {
  duration: {
    fast: number
    normal: number
    slow: number
  }
  easing: {
    default: string
    smooth: string
    bounce: string
  }
}

export interface ThemeComponents {
  button?: {
    primary: string
    secondary: string
  }
  card?: {
    background: string
    border: string
    shadow: string
  }
}

// Presenter Mode Types
export interface PresenterViewState {
  currentSlide: number
  totalSlides: number
  elapsedTime: number
  isPaused: boolean
  notes: string | null
  nextSlide: Slide | null
}

// Export Types
export interface ExportOptions {
  format: 'pdf' | 'html' | 'video'
  quality?: 'low' | 'medium' | 'high'
  includeNotes?: boolean
  selfContained?: boolean // for HTML
  fps?: number // for video
}

// Navigation Types
export interface NavigationState {
  currentSlide: number
  isFullscreen: boolean
  isPresenterMode: boolean
  isBlackScreen: boolean
}

// New Data Visualization Types
export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter'
  datasets: Dataset[]
  labels?: string[]
  options?: ChartOptions
}

export interface Dataset {
  label: string
  data: number[]
  color?: string
  backgroundColor?: string
  borderColor?: string
}

export interface ChartOptions {
  showLegend?: boolean
  showGrid?: boolean
  animate?: boolean
  aspectRatio?: number
  title?: string
}

// Table Types
export interface TableData {
  headers: string[]
  rows: (string | number | boolean)[][]
  style?: TableStyle
  highlights?: number[] // row indices to highlight
}

export interface TableStyle {
  striped?: boolean
  bordered?: boolean
  compact?: boolean
  hover?: boolean
}

// Metrics Types
export interface MetricItem {
  label: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon?: string
  color?: string
  description?: string
}

// Timeline Types
export interface TimelineEvent {
  date: string
  title: string
  description?: string
  icon?: string
  color?: string
  milestone?: boolean
}

// Team Types
export interface TeamMember {
  name: string
  role: string
  image?: string
  bio?: string
  social?: {
    linkedin?: string
    twitter?: string
    email?: string
  }
}

// Testimonial Types
export interface Testimonial {
  quote: string
  author: string
  role?: string
  company?: string
  image?: string
  rating?: number
}

// Gallery Types
export interface GalleryImage {
  src: string
  alt: string
  caption?: string
  aspectRatio?: string
}

// Process Types
export interface ProcessStep {
  number?: number
  title: string
  description: string
  icon?: string
  status?: 'completed' | 'current' | 'upcoming'
}

// Agenda Types
export interface AgendaSection {
  time?: string
  title: string
  duration?: string
  speaker?: string
  description?: string
}
