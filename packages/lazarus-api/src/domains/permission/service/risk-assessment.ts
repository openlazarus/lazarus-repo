import type { RiskAssessment, RiskLevel } from '@domains/permission/types/permission.types'

const RISK_TIMEOUT_MS: Record<string, number> = {
  critical: 60000,
  high: 45000,
  medium: 30000,
  low: 20000,
}

const TOOL_DESCRIPTION_BUILDERS: Record<string, (parameters: any) => string> = {
  Bash: (parameters) => `Run command: ${parameters?.command || 'unknown'}`,
  Write: (parameters) => `Create/overwrite file: ${parameters?.file_path || 'unknown'}`,
  Edit: (parameters) => `Edit file: ${parameters?.file_path || 'unknown'}`,
  MultiEdit: (parameters) => {
    const editCount = parameters?.edits?.length || 0
    return `Make ${editCount} edits in: ${parameters?.file_path || 'unknown'}`
  },
  Delete: (parameters) => `Delete: ${parameters?.path || 'unknown'}`,
  Read: (parameters) => `Read file: ${parameters?.file_path || 'unknown'}`,
  Grep: (parameters) => `Search for pattern: ${parameters?.pattern || 'unknown'}`,
  Glob: (parameters) => `Find files matching: ${parameters?.pattern || 'unknown'}`,
  LS: (parameters) => `List directory: ${parameters?.path || 'current'}`,
  WebSearch: (parameters) => `Search web for: ${parameters?.query || 'unknown'}`,
  WebFetch: (parameters) => `Fetch URL: ${parameters?.url || 'unknown'}`,
  NotebookEdit: (parameters) => `Edit notebook cell: ${parameters?.cell_id || 'unknown'}`,
}

/**
 * Assess the risk level of a tool operation
 *
 * SIMPLIFIED PERMISSION MODEL:
 * - Only email_send requires user permission
 * - Critical destructive Bash commands are auto-denied (safety guardrail)
 * - Everything else is auto-approved
 */
export function assessRiskLevel(toolName: string, parameters: any): RiskAssessment {
  const assessment: RiskAssessment = {
    level: 'low',
    factors: [],
    autoApprove: true, // Default: auto-approve
    autoDeny: false,
    description: '',
  }

  // CRITICAL - Auto-deny destructive system commands (safety guardrail)
  if (toolName === 'Bash') {
    const command = parameters?.command || ''
    if (
      command.match(/rm\s+-rf\s+\/(?:\s|$)|format\s+[cC]:|dd\s+if=.*of=\/dev\/[sh]d|:(){ :|:& };:/)
    ) {
      assessment.level = 'critical'
      assessment.factors.push('Potentially destructive system command')
      assessment.autoDeny = true
      assessment.autoApprove = false
      assessment.description = `Run command: ${command}`
      return assessment
    }
  }

  // ONLY email_send requires user permission
  if (toolName === 'mcp__email-tools__email_send') {
    const recipients = parameters?.to?.join(', ') || 'unknown'
    const subject = parameters?.subject || 'No subject'

    assessment.level = 'medium'
    assessment.factors.push('Outbound email - requires approval')
    assessment.autoApprove = false
    assessment.description = `Send email to ${recipients}: "${subject}"`
    return assessment
  }

  // Everything else: auto-approve
  assessment.factors.push('Auto-approved operation')
  assessment.description = generateHumanReadableDescription(toolName, parameters)
  return assessment
}

/**
 * Generate human-readable description of an operation
 */
export function generateHumanReadableDescription(toolName: string, parameters: any): string {
  const build = TOOL_DESCRIPTION_BUILDERS[toolName]
  if (build) {
    return build(parameters)
  }
  return `Use ${toolName} tool with parameters: ${JSON.stringify(parameters).substring(0, 100)}`
}

/**
 * Get timeout duration based on risk level
 */
export function getTimeoutForRiskLevel(riskLevel: RiskLevel): number {
  return RISK_TIMEOUT_MS[riskLevel] ?? 30000
}

/**
 * Format risk level for display (sentence case, no emojis per design system)
 */
export function formatRiskLevel(level: RiskLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1)
}
