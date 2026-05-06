// Slides Component System Exports

// Core components
export { NavigationController } from './core/navigation-controller'
export { SlideCanvas } from './core/slide-canvas'
export { SlideCanvasWithDiff } from './core/slide-canvas-with-diff'
export { SlideRenderer } from './core/slide-renderer'

// Editor
export { SlidesEditor } from './editor/slides-editor'

// Parser and utilities
export {
  defaultPresentation,
  defaultPresentationDefaults,
  getTheme,
  themes,
} from './defaults'
export { ParseError, parsePresentation, presentationToYAML } from './parser'
export { validatePresentation } from './validator'

// Validation types
export type { ValidationResult } from './validator'

// Types
export type {
  Animation,
  AnimationEffect,
  AspectRatio,
  Background,
  CodeOutput,
  ColumnContent,
  ComparisonItem,
  Content,
  ContentStyle,
  ContentType,
  ExportOptions,
  // Additional types
  GridLayout,
  LayoutType,
  ListItem,
  // Navigation and state
  NavigationState,
  // Main types
  PresentationData,
  PresentationDefaults,
  PresentationMeta,
  PresenterViewState,
  Slide,
  SlideType,
  Theme,
  ThemeAnimations,
  ThemeColors,
  ThemeComponents,
  // Enums and unions
  ThemeName,
  ThemeSpacing,
  ThemeTypography,
  TransitionType,
} from './types'
