import { v4 as uuidv4 } from 'uuid'

/**
 * Centralized slug generation and validation utilities
 *
 * This module provides consistent slug handling across teams and workspaces.
 * All slug operations should use these utilities to ensure consistency.
 */

/**
 * Reserved slugs that cannot be used for teams or workspaces
 */
const RESERVED_SLUGS = [
  'admin',
  'api',
  'www',
  'mail',
  'ftp',
  'smtp',
  'pop',
  'imap',
  'localhost',
  'app',
  'web',
  'config',
  'system',
  'root',
  'user',
  'users',
  'team',
  'teams',
  'workspace',
  'workspaces',
  'settings',
  'billing',
  'dashboard',
  'login',
  'signup',
  'logout',
  'auth',
  'oauth',
  'health',
  'status',
  'metrics',
  'webhook',
  'webhooks',
  'static',
  'assets',
  'public',
  'private',
]

/**
 * Slug validation result
 */
export interface SlugValidationResult {
  valid: boolean
  error?: string
}

/**
 * Options for slug generation
 */
export interface SlugGenerationOptions {
  /** Maximum length for the base slug (default: 50) */
  maxLength?: number
  /** Whether to allow uppercase letters (default: false) */
  allowUppercase?: boolean
}

/**
 * Validates slug format according to platform rules:
 * - Minimum 3 characters
 * - Maximum 64 characters
 * - Lowercase letters, numbers, and hyphens only
 * - Cannot start or end with hyphen
 * - Cannot be a reserved slug
 *
 * @param slug - The slug to validate
 * @returns Validation result with error message if invalid
 */
export function validateSlugFormat(slug: string): SlugValidationResult {
  // Length validation
  if (slug.length < 3) {
    return {
      valid: false,
      error: 'Slug must be at least 3 characters long',
    }
  }

  if (slug.length > 64) {
    return {
      valid: false,
      error: 'Slug must be at most 64 characters long',
    }
  }

  // Format validation - lowercase alphanumeric + hyphens
  const slugPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
  if (!slugPattern.test(slug)) {
    return {
      valid: false,
      error: 'Slug must contain only lowercase letters, numbers, and hyphens (not at start/end)',
    }
  }

  // Reserved slug check
  if (isReservedSlug(slug)) {
    return {
      valid: false,
      error: `The slug "${slug}" is reserved and cannot be used`,
    }
  }

  return { valid: true }
}

/**
 * Checks if a slug is reserved
 *
 * @param slug - The slug to check
 * @returns True if the slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase())
}

/**
 * Generates a URL-friendly slug from a name
 *
 * Rules:
 * - Converts to lowercase
 * - Replaces whitespace and special characters with hyphens
 * - Removes leading/trailing hyphens
 * - Truncates to max length
 *
 * @param name - The name to generate a slug from
 * @param options - Generation options
 * @returns A URL-friendly slug
 */
export function generateSlugFromName(name: string, options: SlugGenerationOptions = {}): string {
  const { maxLength = 50, allowUppercase = false } = options

  // Convert to lowercase unless uppercase is explicitly allowed
  let slug = allowUppercase ? name : name.toLowerCase()

  // Replace special characters and whitespace with hyphens
  slug = slug
    .replace(/[^a-z0-9\s-]/gi, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace whitespace with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

  // Truncate to max length
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength)
    // Remove trailing hyphen if truncation created one
    slug = slug.replace(/-$/, '')
  }

  // Ensure minimum length by adding suffix if needed
  if (slug.length < 3) {
    slug = `slug-${uuidv4().substring(0, 8)}`
  }

  return slug
}

/**
 * Ensures a slug is unique by appending a suffix if needed
 *
 * This function will try up to 10 times to find a unique slug by:
 * 1. First trying the base slug
 * 2. Then appending -1, -2, -3, etc.
 * 3. After 10 attempts, appends a random UUID segment
 *
 * @param baseSlug - The base slug to make unique
 * @param checkUniqueness - Async function that checks if a slug already exists
 * @param options - Generation options
 * @returns A unique slug
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  checkUniqueness: (slug: string) => Promise<boolean>,
  options: { maxAttempts?: number; prefix?: string } = {},
): Promise<string> {
  const { maxAttempts = 10, prefix } = options

  let slug = baseSlug
  let attempt = 0

  // Try sequential suffixes first
  while (attempt < maxAttempts) {
    const exists = await checkUniqueness(slug)

    if (!exists) {
      return slug
    }

    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  // Fallback to UUID-based slug
  const fallbackSlug = prefix ? `${prefix}-${uuidv4()}` : `${baseSlug}-${uuidv4().substring(0, 8)}`

  return fallbackSlug
}

/**
 * Generates a completely random slug (fallback option)
 *
 * Format: {prefix}-{8-char-uuid}
 *
 * @param prefix - Optional prefix (default: 'slug')
 * @returns A random slug
 */
export function generateRandomSlug(prefix: string = 'slug'): string {
  return `${prefix}-${uuidv4().substring(0, 8)}`
}

/**
 * Sanitizes a slug by removing invalid characters and formatting
 * This is useful for cleaning user input before validation
 *
 * @param slug - The slug to sanitize
 * @returns Sanitized slug
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
    .replace(/-+/g, '-') // Replace multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'your-domain.example'

/**
 * Extracts slug from an email address
 * Format: anything@{slug}.{EMAIL_DOMAIN}
 *
 * @param email - Email address to parse
 * @returns The slug or null if invalid format
 */
export function extractSlugFromEmail(email: string): string | null {
  const escapedDomain = EMAIL_DOMAIN.replace(/\./g, '\\.')
  const match = email.match(new RegExp(`^[^@]+@([^.]+)\\.${escapedDomain}$`))
  return match ? match[1]! : null
}

/**
 * Generates an email address from a slug
 * Format: {agentId}@{slug}.{EMAIL_DOMAIN}
 *
 * @param slug - Workspace slug
 * @param agentId - Optional agent identifier (for agent-specific emails)
 * @returns Email address
 */
export function generateEmailFromSlug(slug: string, agentId?: string): string {
  const localPart = agentId || slug
  return `${localPart}@${slug}.${EMAIL_DOMAIN}`
}
