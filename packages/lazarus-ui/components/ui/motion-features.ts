/**
 * Centralized motion features configuration for lazy loading
 * This reduces bundle size by only loading the features we need
 */
import { domAnimation } from 'motion/react'

// Export the features we want to use
// domAnimation includes: animations, variants, exit animations, tap/hover/focus gestures
// For lists, we don't need drag gestures or layout animations, so domAnimation is sufficient
export default domAnimation
