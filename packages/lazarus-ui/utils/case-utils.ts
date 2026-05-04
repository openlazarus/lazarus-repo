/**
 * Converts a camelCase string to snake_case
 * @example
 * toSnakeCase('myVariableName') // returns 'my_variable_name'
 * toSnakeCase('userId') // returns 'user_id'
 */
export const toSnakeCase = (str: string): string => {
  return str
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, '')
}

/**
 * Converts a snake_case string to camelCase
 * @example
 * toCamelCase('my_variable_name') // returns 'myVariableName'
 * toCamelCase('user_id') // returns 'userId'
 */
export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Converts all keys in an object from camelCase to snake_case
 * @example
 * objectToSnakeCase({ userId: 1 }) // returns { user_id: 1 }
 */
export const objectToSnakeCase = <T extends Record<string, any>>(
  obj: T,
): Record<string, any> => {
  return Object.keys(obj).reduce(
    (acc, key) => {
      const snakeKey = toSnakeCase(key)
      const value = obj[key]

      acc[snakeKey] =
        value && typeof value === 'object' && !Array.isArray(value)
          ? objectToSnakeCase(value)
          : value

      return acc
    },
    {} as Record<string, any>,
  )
}

/**
 * Converts all keys in an object from snake_case to camelCase
 * @example
 * objectToCamelCase({ user_id: 1 }) // returns { userId: 1 }
 */
export const objectToCamelCase = <T extends Record<string, any>>(
  obj: T,
): Record<string, any> => {
  return Object.keys(obj).reduce(
    (acc, key) => {
      const camelKey = toCamelCase(key)
      const value = obj[key]

      acc[camelKey] =
        value && typeof value === 'object' && !Array.isArray(value)
          ? objectToCamelCase(value)
          : value

      return acc
    },
    {} as Record<string, any>,
  )
}
