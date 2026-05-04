// ── Timezone utilities ──────────────────────────────────────

export function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export function getTimezoneAbbreviation(tz: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    })
    const parts = formatter.formatToParts(new Date())
    return parts.find((p) => p.type === 'timeZoneName')?.value || tz
  } catch {
    return tz
  }
}

export interface TimezoneOption {
  value: string
  label: string
  group: string
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  // Americas
  { value: 'America/New_York', label: 'New York (Eastern)', group: 'Americas' },
  { value: 'America/Chicago', label: 'Chicago (Central)', group: 'Americas' },
  { value: 'America/Denver', label: 'Denver (Mountain)', group: 'Americas' },
  {
    value: 'America/Los_Angeles',
    label: 'Los Angeles (Pacific)',
    group: 'Americas',
  },
  {
    value: 'America/Anchorage',
    label: 'Anchorage (Alaska)',
    group: 'Americas',
  },
  { value: 'Pacific/Honolulu', label: 'Honolulu (Hawaii)', group: 'Americas' },
  { value: 'America/Toronto', label: 'Toronto (Eastern)', group: 'Americas' },
  {
    value: 'America/Vancouver',
    label: 'Vancouver (Pacific)',
    group: 'Americas',
  },
  { value: 'America/Mexico_City', label: 'Mexico City', group: 'Americas' },
  { value: 'America/Sao_Paulo', label: 'Sao Paulo', group: 'Americas' },
  {
    value: 'America/Argentina/Buenos_Aires',
    label: 'Buenos Aires',
    group: 'Americas',
  },
  { value: 'America/Bogota', label: 'Bogota', group: 'Americas' },
  { value: 'America/Santiago', label: 'Santiago', group: 'Americas' },

  // Europe
  { value: 'Europe/London', label: 'London (GMT)', group: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris (CET)', group: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)', group: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)', group: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome (CET)', group: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)', group: 'Europe' },
  { value: 'Europe/Zurich', label: 'Zurich (CET)', group: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET)', group: 'Europe' },
  { value: 'Europe/Athens', label: 'Athens (EET)', group: 'Europe' },
  { value: 'Europe/Helsinki', label: 'Helsinki (EET)', group: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow', group: 'Europe' },
  { value: 'Europe/Istanbul', label: 'Istanbul', group: 'Europe' },

  // Asia & Pacific
  { value: 'Asia/Dubai', label: 'Dubai (GST)', group: 'Asia & Pacific' },
  { value: 'Asia/Kolkata', label: 'Mumbai (IST)', group: 'Asia & Pacific' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', group: 'Asia & Pacific' },
  {
    value: 'Asia/Singapore',
    label: 'Singapore (SGT)',
    group: 'Asia & Pacific',
  },
  {
    value: 'Asia/Hong_Kong',
    label: 'Hong Kong (HKT)',
    group: 'Asia & Pacific',
  },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', group: 'Asia & Pacific' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', group: 'Asia & Pacific' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)', group: 'Asia & Pacific' },
  {
    value: 'Australia/Sydney',
    label: 'Sydney (AEST)',
    group: 'Asia & Pacific',
  },
  {
    value: 'Australia/Melbourne',
    label: 'Melbourne (AEST)',
    group: 'Asia & Pacific',
  },
  {
    value: 'Pacific/Auckland',
    label: 'Auckland (NZST)',
    group: 'Asia & Pacific',
  },

  // Africa & Middle East
  {
    value: 'Africa/Cairo',
    label: 'Cairo (EET)',
    group: 'Africa & Middle East',
  },
  {
    value: 'Africa/Johannesburg',
    label: 'Johannesburg (SAST)',
    group: 'Africa & Middle East',
  },
  {
    value: 'Africa/Lagos',
    label: 'Lagos (WAT)',
    group: 'Africa & Middle East',
  },
  {
    value: 'Asia/Riyadh',
    label: 'Riyadh (AST)',
    group: 'Africa & Middle East',
  },
  {
    value: 'Asia/Jerusalem',
    label: 'Jerusalem (IST)',
    group: 'Africa & Middle East',
  },

  // UTC
  { value: 'UTC', label: 'UTC', group: 'UTC' },
]

/**
 * Get grouped timezone options for rendering in a <select> with <optgroup>.
 */
export function getGroupedTimezones(): Record<string, TimezoneOption[]> {
  const groups: Record<string, TimezoneOption[]> = {}
  for (const tz of TIMEZONE_OPTIONS) {
    if (!groups[tz.group]) groups[tz.group] = []
    groups[tz.group].push(tz)
  }
  return groups
}
