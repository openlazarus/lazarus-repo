/**
 * Email allow list matching utilities.
 *
 * Supports exact email matches (case-insensitive) and domain wildcards (*@domain.com).
 */

/**
 * Extract bare email from a string that may contain a display name.
 * "User Name <user@example.com>" -> "user@example.com"
 */
function extractBareEmail(input: string): string {
  const match = input.match(/<([^>]+)>/)
  return (match ? match[1]! : input).trim().toLowerCase()
}

/**
 * Check if an email matches a single allow list entry.
 * Supports exact match and *@domain.com wildcard.
 */
function matchesEntry(email: string, entry: string): boolean {
  const normalizedEmail = extractBareEmail(email)
  const normalizedEntry = entry.trim().toLowerCase()

  if (normalizedEntry.startsWith('*@')) {
    // Domain wildcard: *@domain.com matches any user at that domain
    const domain = normalizedEntry.slice(2) // remove '*@'
    return normalizedEmail.endsWith('@' + domain)
  }

  // Exact match
  return normalizedEmail === normalizedEntry
}

/**
 * Check if an email matches any entry in the allow list.
 */
export function emailMatchesAllowList(email: string, allowList: string[]): boolean {
  if (!allowList || allowList.length === 0) return false
  return allowList.some((entry) => matchesEntry(email, entry))
}

/**
 * Partition emails into allowed and disallowed based on the allow list.
 */
export function filterEmailsByAllowList(
  emails: string[],
  allowList: string[],
): { allowed: string[]; disallowed: string[] } {
  const allowed: string[] = []
  const disallowed: string[] = []

  for (const email of emails) {
    if (emailMatchesAllowList(email, allowList)) {
      allowed.push(email)
    } else {
      disallowed.push(email)
    }
  }

  return { allowed, disallowed }
}
