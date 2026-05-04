/**
 * Special file types configuration
 * This file contains constants and helper functions for working with special file types
 * like V0 projects and SQLite databases that require custom handling
 */

export const SPECIAL_FILE_TYPES = {
  V0_PROJECT: {
    type: 'v0_project' as const,
    displayName: 'V0 Project',
    description: 'V0 web application project',
    extension: '.app',
    icon: 'REMIX_ICON_V0_PROJECT',
  },
  SQLITE_DATABASE: {
    type: 'sqlite_database' as const,
    displayName: 'SQLite Database',
    description: 'SQLite database file',
    extension: '.db',
    icon: 'REMIX_ICON_SQLITE_DATABASE',
  },
} as const

/**
 * Get the file path for a V0 project within a workspace
 * @param workspacePath - The absolute path to the workspace directory
 * @param projectName - The name of the project
 * @returns The absolute path to the .app file
 */
export function getV0ProjectPath(
  workspacePath: string,
  projectName: string,
): string {
  const normalizedPath = workspacePath.endsWith('/')
    ? workspacePath.slice(0, -1)
    : workspacePath

  const fileName = projectName.endsWith(SPECIAL_FILE_TYPES.V0_PROJECT.extension)
    ? projectName
    : `${projectName}${SPECIAL_FILE_TYPES.V0_PROJECT.extension}`

  return `${normalizedPath}/${fileName}`
}

/**
 * Get the file path for a SQLite database within a workspace
 * @param workspacePath - The absolute path to the workspace directory
 * @param databaseName - The name of the database
 * @returns The absolute path to the .sqlite file
 */
export function getSQLiteDBPath(
  workspacePath: string,
  databaseName: string,
): string {
  const normalizedPath = workspacePath.endsWith('/')
    ? workspacePath.slice(0, -1)
    : workspacePath

  const fileName = databaseName.endsWith(
    SPECIAL_FILE_TYPES.SQLITE_DATABASE.extension,
  )
    ? databaseName
    : `${databaseName}${SPECIAL_FILE_TYPES.SQLITE_DATABASE.extension}`

  return `${normalizedPath}/${fileName}`
}

/**
 * Check if a given path is a V0 project file
 * @param path - The path to check
 * @returns true if the path ends with .app extension
 */
export function isV0ProjectFile(path: string): boolean {
  return path.toLowerCase().endsWith(SPECIAL_FILE_TYPES.V0_PROJECT.extension)
}

/**
 * Check if a given filename is a SQLite database file
 * @param fileName - The filename to check
 * @returns true if the filename ends with .sqlite extension
 */
export function isSQLiteDatabaseFile(fileName: string): boolean {
  return fileName
    .toLowerCase()
    .endsWith(SPECIAL_FILE_TYPES.SQLITE_DATABASE.extension)
}
