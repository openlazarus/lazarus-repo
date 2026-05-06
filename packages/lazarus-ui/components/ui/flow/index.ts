// Flow UI Components
export { FlowCanvas } from './flow-canvas'
export { FlowEditor } from './flow-editor'

// Types
export type * from './types'

// Utilities
export { updateNodePosition, updateNodeProperty } from './lib/documentUpdater'
export { parseFlowDocument } from './lib/parser'

// Templates
export {
  defaultFlowDocument,
  essayOutlineTemplate,
  projectPlanTemplate,
  systemArchitectureTemplate,
} from './lib/templates'
