export const toQuery = (params: Record<string, unknown>): string => {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    usp.append(key, String(value))
  }
  return usp.toString()
}
