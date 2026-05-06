/**
 * Unified email authorization helper.
 *
 * Consolidates the "is this email allowed?" logic for both inbound and outbound,
 * using workspace membership + optional allow list.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { emailMatchesAllowList } from './email-allowlist'
import { workspaceMemberService } from '@domains/workspace/service/workspace-member.service'

export interface AgentEmailAuthConfig {
  restrictToWorkspaceMembers: boolean
  allowedExternalEmails: string[]
}

/**
 * Load the email authorization config from an agent's config file.
 * Defaults to restricted mode with empty allow list if config can't be read.
 */
export async function loadAgentEmailAuthConfig(
  workspacePath: string,
  agentId: string,
): Promise<AgentEmailAuthConfig> {
  try {
    const configPath = path.join(workspacePath, '.agents', agentId, 'config.agent.json')
    const content = await fs.readFile(configPath, 'utf-8')
    const config = JSON.parse(content)

    return {
      restrictToWorkspaceMembers: config.email?.restrictToWorkspaceMembers !== false,
      allowedExternalEmails: Array.isArray(config.email?.allowedExternalEmails)
        ? config.email.allowedExternalEmails
        : [],
    }
  } catch {
    // Default to secure behavior if config cannot be loaded
    return {
      restrictToWorkspaceMembers: true,
      allowedExternalEmails: [],
    }
  }
}

/**
 * Check if a single email is authorized to send to/receive from an agent.
 *
 * Authorization passes if:
 * 1. restrictToWorkspaceMembers is false (unrestricted), OR
 * 2. Email is a workspace member, OR
 * 3. Email matches the allow list
 */
export async function isEmailAuthorized(
  workspaceId: string,
  email: string,
  config: AgentEmailAuthConfig,
): Promise<boolean> {
  if (!config.restrictToWorkspaceMembers) return true

  // Check allow list first (no DB call needed)
  if (emailMatchesAllowList(email, config.allowedExternalEmails)) return true

  // Check workspace membership
  return workspaceMemberService.isWorkspaceMember(workspaceId, email)
}

/**
 * Batch validate emails against authorization config.
 * Returns { valid, invalid } arrays.
 */
export async function validateAuthorizedEmails(
  workspaceId: string,
  emails: string[],
  config: AgentEmailAuthConfig,
): Promise<{ valid: string[]; invalid: string[] }> {
  if (!config.restrictToWorkspaceMembers) {
    return { valid: [...emails], invalid: [] }
  }

  if (emails.length === 0) {
    return { valid: [], invalid: [] }
  }

  // Partition: emails on allow list pass immediately
  const needsMemberCheck: string[] = []
  const valid: string[] = []

  for (const email of emails) {
    if (emailMatchesAllowList(email, config.allowedExternalEmails)) {
      valid.push(email)
    } else {
      needsMemberCheck.push(email)
    }
  }

  // Check remaining emails against workspace membership
  if (needsMemberCheck.length > 0) {
    const memberValidation = await workspaceMemberService.validateRecipientEmails(
      workspaceId,
      needsMemberCheck,
    )
    valid.push(...memberValidation.valid)
    return { valid, invalid: memberValidation.invalid }
  }

  return { valid, invalid: [] }
}
