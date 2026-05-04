/**
 * Centralized mapping of source/preset IDs to their logo paths.
 * This is used across all source-related components for consistent logo display.
 */

// Map preset IDs to logo paths
export const PRESET_LOGOS: Record<string, string> = {
  // Existing sources
  'google-analytics': '/logos/google-analytics-logo.svg',
  'shopify-dev': '/logos/shopify-logo.svg',
  givebutter: '/logos/givebutter-logo.svg',
  supabase: '/logos/supabase-logo.svg',
  linear: '/logos/linear-logo.svg',
  atlassian: '/logos/atlassian-logo.svg',
  hubspot: '/logos/hubspot-logo.svg',
  notion: '/logos/notion-logo.svg',
  // Developer tools
  github: '/logos/github-logo.svg',
  asana: '/logos/asana-logo.svg',
  sentry: '/logos/sentry-logo.svg',
  figma: '/logos/figma-logo.svg',
  monday: '/logos/monday-logo.svg',
  datadog: '/logos/datadog-logo.svg',
  // Communication
  slack: '/logos/slack-logo.svg',
  zendesk: '/logos/zendesk-logo.svg',
  twilio: '/logos/twilio-logo.svg',
  // E-commerce
  stripe: '/logos/stripe-logo.svg',
  // Database
  postgres: '/logos/postgres-logo.svg',
  mysql: '/logos/mysql-logo.svg',
  // Storage
  'google-drive': '/logos/google-drive-logo.svg',
  airtable: '/logos/airtable-logo.svg',
  dropbox: '/logos/dropbox-logo.svg',
  // Design
  canva: '/logos/canva-logo.svg',
}

/**
 * Get the logo path for a source by preset_id or server name
 * @param presetId - The preset ID of the source
 * @param serverName - The server name as fallback
 * @returns The logo path or undefined if not found
 */
export const getSourceLogoPath = (
  presetId?: string,
  serverName?: string,
): string | undefined => {
  if (presetId && PRESET_LOGOS[presetId]) {
    return PRESET_LOGOS[presetId]
  }
  if (serverName && PRESET_LOGOS[serverName]) {
    return PRESET_LOGOS[serverName]
  }
  return undefined
}
