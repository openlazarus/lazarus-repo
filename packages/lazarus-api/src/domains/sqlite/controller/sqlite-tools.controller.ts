import { Request, Response } from 'express'
import Database from 'better-sqlite3'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import { resolveSecureDatabasePath, ensureDatabaseDirectory } from '@utils/sqlite-path'
import { resolveWorkspacePath } from '@domains/cache/service/workspace-path-cache'
import { ApiError, BadRequestError, InternalServerError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const log = createLogger('sqlite-tools')

const connections = new Map<string, Database.Database>()

interface TableSchema {
  name: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
    primaryKey: boolean
    defaultValue?: string
  }>
  rowCount: number
}

interface DatabaseSchema {
  tables: TableSchema[]
  generatedAt: string
}

interface DatabaseInfo {
  name: string
  path: string
  size: number
  modifiedAt: string
  schema: DatabaseSchema
}

async function getWorkspacePath(workspaceId: string): Promise<string> {
  return resolveWorkspacePath(workspaceId)
}

async function getWorkspaceDatabasePath(workspaceId: string, dbPath: string): Promise<string> {
  const workspacePath = await getWorkspacePath(workspaceId)
  return resolveSecureDatabasePath(workspacePath, dbPath)
}

function getConnection(fullPath: string): Database.Database {
  if (!connections.has(fullPath)) {
    const dir = path.dirname(fullPath)
    fsSync.mkdirSync(dir, { recursive: true })

    const db = new Database(fullPath)
    db.pragma('journal_mode = WAL')
    connections.set(fullPath, db)
  }

  return connections.get(fullPath)!
}

async function getSchema(fullPath: string): Promise<DatabaseSchema> {
  const db = getConnection(fullPath)

  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_metadata'",
    )
    .all() as Array<{ name: string }>

  const schema: DatabaseSchema = {
    tables: [],
    generatedAt: new Date().toISOString(),
  }

  for (const table of tables) {
    const columns = db.prepare(`PRAGMA table_info('${table.name}')`).all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>

    const rowCountResult = db.prepare(`SELECT COUNT(*) as count FROM '${table.name}'`).get() as {
      count: number
    }

    schema.tables.push({
      name: table.name,
      columns: columns.map((col) => ({
        name: col.name,
        type: col.type,
        nullable: col.notnull === 0,
        primaryKey: col.pk > 0,
        defaultValue: col.dflt_value || undefined,
      })),
      rowCount: rowCountResult.count,
    })
  }

  return schema
}

async function getDatabaseStats(
  fullPath: string,
): Promise<{ tables: number; totalRows: number; sizeBytes: number }> {
  const db = getConnection(fullPath)
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_metadata'",
    )
    .all() as Array<{ name: string }>

  let totalRows = 0
  for (const table of tables) {
    const result = db.prepare(`SELECT COUNT(*) as count FROM '${table.name}'`).get() as {
      count: number
    }
    totalRows += result.count
  }

  const stats = await fs.stat(fullPath)

  return {
    tables: tables.length,
    totalRows,
    sizeBytes: stats.size,
  }
}

class SqliteToolsController {
  async listDatabases(req: Request, res: Response) {
    const databases: DatabaseInfo[] = []

    const scanDirectory = async (dir: string, relativePath: string = ''): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name

          if (entry.isFile() && entry.name.endsWith('.db')) {
            try {
              const stats = await fs.stat(fullPath)
              const schema = await getSchema(fullPath)
              const dbPath = entryRelativePath.replace('.db', '')
              databases.push({
                name: dbPath,
                path: entryRelativePath,
                size: stats.size,
                modifiedAt: stats.mtime.toISOString(),
                schema,
              })
            } catch (e) {
              log.error({ err: e }, `Error reading ${entryRelativePath}:`)
            }
          } else if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              await scanDirectory(fullPath, entryRelativePath)
            }
          }
        }
      } catch (e) {
        log.debug({ err: e }, 'Directory might not be readable')
      }
    }

    try {
      const workspaceId = req.workspaceId!
      const workspacePath = await getWorkspacePath(workspaceId)

      await scanDirectory(workspacePath)

      res.json({
        success: true,
        databases,
        count: databases.length,
      })
    } catch (error) {
      log.error({ err: error }, 'SQLite list databases error')
      throw new InternalServerError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async createDatabase(req: Request, res: Response) {
    try {
      const { name, description, initialSchema } = req.body
      const workspaceId = req.workspaceId!

      if (!name) {
        throw new BadRequestError('name is required')
      }

      const workspacePath = await getWorkspacePath(workspaceId)

      let fullPath: string
      try {
        fullPath = ensureDatabaseDirectory(workspacePath, name)
      } catch (error) {
        throw new BadRequestError(
          'Invalid database path',
          error instanceof Error ? error.message : 'Unknown error',
        )
      }

      if (fsSync.existsSync(fullPath)) {
        throw new BadRequestError(`Database '${name}' already exists.`)
      }

      const db = getConnection(fullPath)

      db.exec(`CREATE TABLE IF NOT EXISTS _metadata (key TEXT PRIMARY KEY, value TEXT)`)
      db.prepare('INSERT OR REPLACE INTO _metadata (key, value) VALUES (?, ?)').run(
        'created_at',
        new Date().toISOString(),
      )
      if (description) {
        db.prepare('INSERT OR REPLACE INTO _metadata (key, value) VALUES (?, ?)').run(
          'description',
          description,
        )
      }

      if (initialSchema && Array.isArray(initialSchema)) {
        for (const sql of initialSchema) {
          db.exec(sql)
        }
      }

      const schema = await getSchema(fullPath)
      const stats = await getDatabaseStats(fullPath)

      return res.json({
        success: true,
        database: {
          name,
          description,
          path: `${name}.db`,
          status: 'ready',
          createdAt: new Date().toISOString(),
          stats: {
            tables: stats.tables,
            totalRows: stats.totalRows,
            sizeBytes: stats.sizeBytes,
          },
          schema,
        },
      })
    } catch (error) {
      if (error instanceof ApiError) throw error
      log.error({ err: error }, 'SQLite create database error')
      throw new InternalServerError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async query(req: Request, res: Response) {
    try {
      const { database, sql, params } = req.body
      const workspaceId = req.workspaceId!

      if (!database || !sql) {
        throw new BadRequestError('Missing required fields')
      }

      const trimmedSql = sql.trim().toUpperCase()
      if (!trimmedSql.startsWith('SELECT')) {
        throw new BadRequestError(
          'Only SELECT queries are allowed in query(). Use execute() for other operations.',
        )
      }

      const fullPath = await getWorkspaceDatabasePath(workspaceId, database)
      const db = getConnection(fullPath)

      const stmt = db.prepare(sql)
      const rows = stmt.all(params || [])

      return res.json({
        success: true,
        rows,
        count: rows.length,
      })
    } catch (error) {
      if (error instanceof ApiError) throw error
      log.error({ err: error }, 'SQLite query error')
      throw new InternalServerError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async execute(req: Request, res: Response) {
    try {
      const { database, sql, params } = req.body
      const workspaceId = req.workspaceId!

      if (!database || !sql) {
        throw new BadRequestError('Missing required fields')
      }

      const fullPath = await getWorkspaceDatabasePath(workspaceId, database)
      const db = getConnection(fullPath)

      const stmt = db.prepare(sql)
      const result = stmt.run(params || [])

      return res.json({
        success: true,
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid,
      })
    } catch (error) {
      if (error instanceof ApiError) throw error
      log.error({ err: error }, 'SQLite execute error')
      throw new InternalServerError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async getSchemaInfo(req: Request, res: Response) {
    try {
      const database = req.query.database as string
      const workspaceId = req.workspaceId!

      if (!database) {
        throw new BadRequestError('Missing required parameters')
      }

      const fullPath = await getWorkspaceDatabasePath(workspaceId, database)
      const schema = await getSchema(fullPath)

      return res.json({
        success: true,
        schema,
      })
    } catch (error) {
      if (error instanceof ApiError) throw error
      log.error({ err: error }, 'SQLite schema info error')
      throw new InternalServerError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async exportDatabase(req: Request, res: Response) {
    try {
      const { database } = req.body
      const workspaceId = req.workspaceId!

      if (!database) {
        throw new BadRequestError('Missing required fields')
      }

      const fullPath = await getWorkspaceDatabasePath(workspaceId, database)
      const db = getConnection(fullPath)

      const tables = db
        .prepare(
          "SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_metadata'",
        )
        .all() as Array<{ sql: string }>

      let dump = '-- SQLite Database Export\n'
      dump += `-- Database: ${database}\n`
      dump += `-- Exported: ${new Date().toISOString()}\n\n`

      for (const table of tables) {
        if (table.sql) {
          dump += `${table.sql};\n\n`
        }
      }

      const tableNames = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_metadata'",
        )
        .all() as Array<{ name: string }>

      for (const { name } of tableNames) {
        const rows = db.prepare(`SELECT * FROM '${name}'`).all()

        if (rows.length > 0) {
          dump += `-- Data for table: ${name}\n`

          for (const row of rows) {
            const columns = Object.keys(row as object)
            const values = Object.values(row as object).map((v) =>
              v === null ? 'NULL' : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v,
            )

            dump += `INSERT INTO '${name}' (${columns.join(', ')}) VALUES (${values.join(', ')});\n`
          }

          dump += '\n'
        }
      }

      return res.json({
        success: true,
        sql: dump,
      })
    } catch (error) {
      if (error instanceof ApiError) throw error
      log.error({ err: error }, 'SQLite export error')
      throw new InternalServerError(error instanceof Error ? error.message : 'Unknown error')
    }
  }
}

export const sqliteToolsController = new SqliteToolsController()
