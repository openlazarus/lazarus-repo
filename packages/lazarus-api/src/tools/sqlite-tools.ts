/**
 * SQLite Tools - Thin wrapper around sqlite3 CLI
 *
 * Provides traceability (shows as "SQLite" tool, not "Bash")
 * while using native sqlite3 CLI under the hood.
 *
 * Supports nested paths like "folder/subfolder/database" for databases
 * stored in subdirectories within the workspace.
 *
 * Agents discover .db files via filesystem, then use these tools to interact.
 */

import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
import * as path from 'path'
import { resolveSecureDatabasePath } from '@utils/sqlite-path'
import { getExecutionContext } from '@domains/execution/service/execution-context'
import { createLogger } from '@utils/logger'

const log = createLogger('sqlite-tools')

function getWorkspacePath(): string {
  const wp = getExecutionContext().workspacePath
  if (!wp) throw new Error('WORKSPACE_PATH not set')
  return wp
}

/**
 * Validates and resolves a database path within the workspace.
 * Uses shared utility from sqlite-path.ts for consistent path validation.
 */
function getDbPath(dbPath: string): string {
  return resolveSecureDatabasePath(getWorkspacePath(), dbPath)
}

// List all databases in workspace
const listDatabases = tool(
  'list_databases',
  'List all SQLite databases in the current workspace. Recursively scans for .db files. Use this FIRST to discover available databases before trying to query them.',
  {},
  async () => {
    try {
      const workspacePath = getWorkspacePath()
      const databases: Array<{
        name: string
        path: string
        tables: number
        sizeBytes: number
        modifiedAt: string
      }> = []

      const scanDirectory = async (dir: string, relativePath: string = '') => {
        try {
          const entries = await fsPromises.readdir(dir, { withFileTypes: true })
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)
            const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name

            if (entry.isFile() && entry.name.endsWith('.db')) {
              try {
                const stats = fs.statSync(fullPath)
                const output = execSync(
                  `sqlite3 "${fullPath}" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_metadata'"`,
                  { encoding: 'utf-8', maxBuffer: 1024 * 1024 },
                ).trim()
                const tableCount = output ? output.split('\n').length : 0
                databases.push({
                  name: entryRelativePath.replace('.db', ''),
                  path: entryRelativePath,
                  tables: tableCount,
                  sizeBytes: stats.size,
                  modifiedAt: stats.mtime.toISOString(),
                })
              } catch (err) {
                log.debug({ err }, 'Skip invalid databases')
              }
            } else if (
              entry.isDirectory() &&
              !entry.name.startsWith('.') &&
              entry.name !== 'node_modules'
            ) {
              await scanDirectory(fullPath, entryRelativePath)
            }
          }
        } catch (err) {
          log.debug({ err }, 'Directory might not be readable')
        }
      }

      await scanDirectory(workspacePath)

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                workspacePath,
                databases,
                count: databases.length,
                hint:
                  databases.length === 0
                    ? 'No databases found. Use sqlite_execute with CREATE TABLE to create one.'
                    : 'Use sqlite_schema tool with a database path to see its structure.',
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (err: any) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }] }
    }
  },
)

// Get schema (tables and columns)
const schema = tool(
  'sqlite_schema',
  'Get the schema of a SQLite database (tables and their CREATE statements). Supports nested paths like "folder/database".',
  {
    database: z
      .string()
      .describe(
        'Database path (can include folders, without .db extension). Examples: "mydb", "data/users"',
      ),
  },
  async ({ database }) => {
    try {
      const dbPath = getDbPath(database)
      if (!fs.existsSync(dbPath)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: `Database '${database}' not found` }),
            },
          ],
        }
      }
      const output = execSync(`sqlite3 "${dbPath}" ".schema"`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      }).trim()
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ database, schema: output }) }],
      }
    } catch (err: any) {
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify({ error: err.stderr || err.message }) },
        ],
      }
    }
  },
)

// Execute SELECT query
const query = tool(
  'sqlite_query',
  'Execute a SELECT query on a SQLite database, returns JSON. Supports nested paths like "folder/database".',
  {
    database: z
      .string()
      .describe(
        'Database path (can include folders, without .db extension). Examples: "mydb", "data/users"',
      ),
    sql: z.string().describe('SELECT SQL query'),
  },
  async ({ database, sql }) => {
    try {
      const dbPath = getDbPath(database)
      if (!fs.existsSync(dbPath)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: `Database '${database}' not found` }),
            },
          ],
        }
      }
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: 'Only SELECT queries allowed. Use sqlite_execute for modifications.',
              }),
            },
          ],
        }
      }
      const output = execSync(`sqlite3 -json "${dbPath}" "${sql.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      }).trim()
      const rows = output ? JSON.parse(output) : []
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ rows, count: rows.length }) }],
      }
    } catch (err: any) {
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify({ error: err.stderr || err.message }) },
        ],
      }
    }
  },
)

// Execute INSERT/UPDATE/DELETE/DDL
const execute = tool(
  'sqlite_execute',
  'Execute SQL statements on a SQLite database (INSERT, UPDATE, DELETE, CREATE, ALTER, DROP). Supports nested paths like "folder/database". Creates parent directories if needed.',
  {
    database: z
      .string()
      .describe(
        'Database path (can include folders, without .db extension). Examples: "mydb", "data/users"',
      ),
    sql: z.string().describe('SQL statement(s) to execute'),
  },
  async ({ database, sql }) => {
    try {
      const dbPath = getDbPath(database)

      // Create parent directories if they don't exist
      const dir = path.dirname(dbPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      execSync(`sqlite3 "${dbPath}" "${sql.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      })
      const changes = execSync(`sqlite3 "${dbPath}" "SELECT changes()"`, {
        encoding: 'utf-8',
      }).trim()
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, changes: parseInt(changes) || 0 }),
          },
        ],
      }
    } catch (err: any) {
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify({ error: err.stderr || err.message }) },
        ],
      }
    }
  },
)

export const sqliteTools = [listDatabases, schema, query, execute]

export const sqliteToolsServer = createSdkMcpServer({
  name: 'sqlite-tools',
  version: '5.1.0',
  tools: sqliteTools,
})

export function createSqliteToolsServer() {
  return createSdkMcpServer({ name: 'sqlite-tools', version: '5.1.0', tools: sqliteTools })
}

export const sqliteToolsNamed = { listDatabases, schema, query, execute }
