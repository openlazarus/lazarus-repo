/**
 * ID validation utilities
 *
 * Reusable guards for validating entity IDs before passing them to
 * database queries. Prevents invalid values (undefined, null, empty strings)
 * from reaching Supabase and causing 400 errors.
 */

/**
 * Check if a value is a valid entity ID (non-empty string, not "undefined"/"null")
 */
export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value !== 'undefined' && value !== 'null'
}
