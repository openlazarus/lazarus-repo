/**
 * Workspace Template Definitions
 *
 * This file defines pre-configured workspace templates that users can choose
 * when creating a new workspace. Each template includes a specific set of agents
 * tailored for different use cases.
 */

export interface WorkspaceTemplate {
  id: string
  name: string
  description: string
  icon: string
  agentTemplateIds: string[]
  category: 'general' | 'sales' | 'finance' | 'custom'
  isPremium?: boolean
}

/**
 * Available workspace templates
 */
export const WORKSPACE_TEMPLATES: Record<string, WorkspaceTemplate> = {
  blank: {
    id: 'blank',
    name: 'Blank Workspace',
    description:
      'Start from scratch with an empty workspace. Add your own custom agents as needed.',
    icon: '📄',
    agentTemplateIds: [],
    category: 'general',
    isPremium: false,
  },

  default: {
    id: 'default',
    name: 'General Purpose',
    description:
      'General purpose workspace with the Lazarus coordinator agent. Perfect for getting started.',
    icon: '⚡',
    agentTemplateIds: [],
    category: 'general',
    isPremium: false,
  },

  presales: {
    id: 'presales',
    name: 'Pre-Sales',
    description:
      'Specialized workspace for sales teams. Includes prospect research, proposal generation, and competitive intelligence agents.',
    icon: '💼',
    agentTemplateIds: ['sales-researcher', 'proposal-generator', 'competitor-analyst'],
    category: 'sales',
    isPremium: false,
  },

  finance: {
    id: 'finance',
    name: 'Accounting & Finance',
    description:
      'Financial operations workspace with analysis, reporting, and reconciliation capabilities. Ideal for finance teams.',
    icon: '💰',
    agentTemplateIds: ['financial-analyst', 'report-generator', 'reconciliation-specialist'],
    category: 'finance',
    isPremium: false,
  },
}

/**
 * Get all workspace templates
 */
export function getAllWorkspaceTemplates(): WorkspaceTemplate[] {
  return Object.values(WORKSPACE_TEMPLATES)
}

/**
 * Get workspace template by ID
 */
export function getWorkspaceTemplate(templateId: string): WorkspaceTemplate | null {
  return WORKSPACE_TEMPLATES[templateId] || null
}

/**
 * Get default workspace template
 */
export function getDefaultWorkspaceTemplate(): WorkspaceTemplate {
  return WORKSPACE_TEMPLATES['default']!
}

/**
 * Get workspace templates by category
 */
export function getWorkspaceTemplatesByCategory(
  category: WorkspaceTemplate['category'],
): WorkspaceTemplate[] {
  return Object.values(WORKSPACE_TEMPLATES).filter((template) => template.category === category)
}

/**
 * Validate template ID
 */
export function isValidTemplateId(templateId: string): boolean {
  return templateId in WORKSPACE_TEMPLATES
}
