#!/usr/bin/env node

/**
 * SQLite Tools MCP Server - Standalone Server
 *
 * This file creates a standalone MCP server that can be launched as a subprocess
 * for stdio-based communication with Claude Code.
 *
 * DATABASE STORAGE STRUCTURE:
 * - Databases are stored as {path}.db files in the workspace
 * - Supports nested paths like "folder/subfolder/database.db"
 * - Path segments must be alphanumeric, underscore, or hyphen only
 *
 * IMPORTANT: WORKSPACE_PATH environment variable must be set.
 */

import * as readline from 'readline'
import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
import { resolveSecureDatabasePath } from '@utils/sqlite-path'
import { getExecutionContext } from '@domains/execution/service/execution-context'

// Connection pool
const connections = new Map<string, Database.Database>()

// Helper functions
function getWorkspacePath(): string {
  const wp = getExecutionContext().workspacePath
  if (!wp) {
    throw new Error('WORKSPACE_PATH not set — no execution context or env var')
  }
  return wp
}

function getDatabasePath(dbPath: string): string {
  const workspacePath = getWorkspacePath()
  return resolveSecureDatabasePath(workspacePath, dbPath)
}

function getConnection(dbPath: string, createIfNotExists: boolean = false): Database.Database {
  const fullPath = getDatabasePath(dbPath)

  if (!connections.has(fullPath)) {
    if (!createIfNotExists && !fs.existsSync(fullPath)) {
      throw new Error(
        `Database '${dbPath}' not found. Use create_database tool first, or list_databases to see available databases.`,
      )
    }

    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const db = new Database(fullPath)
    db.pragma('journal_mode = WAL')
    connections.set(fullPath, db)
  }

  return connections.get(fullPath)!
}

// Tool definitions
const tools = [
  {
    name: 'list_databases',
    description:
      'List all SQLite databases in the current workspace. Recursively scans for .db files. Use this FIRST to discover available databases before trying to query them.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_database',
    description:
      'Create a new SQLite database in the workspace. Supports nested paths like "folder/subfolder/database" for organizing databases in subdirectories.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description:
            'Database path (can include folders). Examples: "contacts", "data/users", "reports/2024/sales". Use alphanumeric, hyphens, and underscores only.',
        },
        description: {
          type: 'string',
          description: 'Optional description for the database',
        },
        initialSchema: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional array of CREATE TABLE statements to initialize the schema',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'schema_info',
    description:
      'Get detailed schema information for a database including tables, columns, types, and row counts.',
    inputSchema: {
      type: 'object',
      properties: {
        database: {
          type: 'string',
          description:
            'Database path (can include folders). Use list_databases to see available databases.',
        },
      },
      required: ['database'],
    },
  },
  {
    name: 'query',
    description:
      'Execute a SELECT query on a database. Returns rows as JSON. For INSERT/UPDATE/DELETE, use the execute tool instead.',
    inputSchema: {
      type: 'object',
      properties: {
        database: {
          type: 'string',
          description:
            'Database path (can include folders). Use list_databases to see available databases.',
        },
        sql: {
          type: 'string',
          description: 'SELECT SQL query to execute',
        },
        params: {
          type: 'array',
          description: 'Optional array of parameter values for ? placeholders',
          items: {},
        },
      },
      required: ['database', 'sql'],
    },
  },
  {
    name: 'execute',
    description:
      'Execute SQL statements on a database. Supports INSERT, UPDATE, DELETE, and DDL (CREATE, ALTER, DROP). Returns affected row count.',
    inputSchema: {
      type: 'object',
      properties: {
        database: {
          type: 'string',
          description:
            'Database path (can include folders). Use list_databases to see available databases.',
        },
        statements: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of SQL statements to execute. Each will be executed in order.',
        },
      },
      required: ['database', 'statements'],
    },
  },
  {
    name: 'export_database',
    description:
      'Export a database to SQL dump, JSON, or CSV format. The exported file is saved alongside the database.',
    inputSchema: {
      type: 'object',
      properties: {
        database: {
          type: 'string',
          description: 'Database path to export',
        },
        format: {
          type: 'string',
          enum: ['sql', 'json', 'csv'],
          description: 'Export format: sql (dump), json (data), or csv (tables)',
        },
        tables: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of specific tables to export',
        },
      },
      required: ['database', 'format'],
    },
  },
]

// Tool handlers
async function listDatabases(): Promise<unknown> {
  const databases: unknown[] = []

  const scanDirectory = async (dir: string, relativePath: string = ''): Promise<void> => {
    try {
      const entries = await fsPromises.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name

        if (entry.isFile() && entry.name.endsWith('.db')) {
          try {
            const stats = fs.statSync(fullPath)
            const db = new Database(fullPath, { readonly: true })
            const tables = db
              .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_metadata'",
              )
              .all() as Array<{ name: string }>
            db.close()

            const dbPath = entryRelativePath.replace('.db', '')
            databases.push({
              name: dbPath,
              path: entryRelativePath,
              tables: tables.length,
              sizeBytes: stats.size,
              modifiedAt: stats.mtime.toISOString(),
            })
          } catch (err) {
            process.stderr.write(`Skip invalid databases: ${err}\n`)
          }
        } else if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDirectory(fullPath, entryRelativePath)
          }
        }
      }
    } catch (err) {
      process.stderr.write(`Directory might not be readable: ${err}\n`)
    }
  }

  try {
    const workspacePath = getWorkspacePath()

    await scanDirectory(workspacePath)

    return {
      success: true,
      workspacePath,
      databases,
      count: databases.length,
      hint:
        databases.length === 0
          ? 'No databases found. Use create_database to create one.'
          : 'Use schema_info tool with a database path to see its structure.',
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function createDatabase(args: {
  name: string
  description?: string
  initialSchema?: string[]
}): Promise<any> {
  try {
    // Validate path using secure resolution (will throw if invalid)
    const fullPath = getDatabasePath(args.name)

    if (fs.existsSync(fullPath)) {
      return { success: false, error: `Database '${args.name}' already exists.` }
    }

    const db = getConnection(args.name, true)
    db.exec(`CREATE TABLE IF NOT EXISTS _metadata (key TEXT PRIMARY KEY, value TEXT)`)
    db.prepare('INSERT OR REPLACE INTO _metadata (key, value) VALUES (?, ?)').run(
      'created_at',
      new Date().toISOString(),
    )

    if (args.description) {
      db.prepare('INSERT OR REPLACE INTO _metadata (key, value) VALUES (?, ?)').run(
        'description',
        args.description,
      )
    }

    if (args.initialSchema && Array.isArray(args.initialSchema)) {
      for (const sql of args.initialSchema) {
        db.exec(sql)
      }
    }

    return {
      success: true,
      database: {
        name: args.name,
        path: `${args.name}.db`,
        status: 'ready',
      },
      hint: 'Use execute tool with SQL statements to add tables, or query tool to read data.',
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function schemaInfo(args: { database: string }): Promise<any> {
  try {
    const db = getConnection(args.database)
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_metadata'",
      )
      .all() as Array<{ name: string }>

    const schema = tables.map((table) => {
      const columns = db.prepare(`PRAGMA table_info('${table.name}')`).all()
      const rowCount = db.prepare(`SELECT COUNT(*) as count FROM '${table.name}'`).get() as {
        count: number
      }
      const indexes = db.prepare(`PRAGMA index_list('${table.name}')`).all()
      const foreignKeys = db.prepare(`PRAGMA foreign_key_list('${table.name}')`).all()

      return {
        name: table.name,
        columns: columns.map((col: any) => ({
          name: col.name,
          type: col.type,
          nullable: col.notnull === 0,
          primaryKey: col.pk > 0,
          defaultValue: col.dflt_value,
        })),
        rowCount: rowCount.count,
        indexes: indexes.map((idx: any) => ({ name: idx.name, unique: idx.unique === 1 })),
        foreignKeys: foreignKeys.map((fk: any) => ({
          column: fk.from,
          referencedTable: fk.table,
          referencedColumn: fk.to,
        })),
      }
    })

    return {
      success: true,
      database: args.database,
      tables: schema,
      tableCount: schema.length,
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function queryDatabase(args: {
  database: string
  sql: string
  params?: any[]
}): Promise<any> {
  try {
    const trimmedSql = args.sql.trim().toUpperCase()
    if (!trimmedSql.startsWith('SELECT')) {
      return {
        success: false,
        error: 'Only SELECT queries are allowed. Use execute tool for INSERT/UPDATE/DELETE/DDL.',
      }
    }

    const db = getConnection(args.database)
    const rows = db.prepare(args.sql).all(...(args.params || []))

    return { success: true, database: args.database, rows, rowCount: rows.length }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function executeStatements(args: { database: string; statements: string[] }): Promise<any> {
  try {
    const db = getConnection(args.database)
    const results = []
    let totalChanges = 0

    for (const stmt of args.statements) {
      const result = db.prepare(stmt).run()
      results.push({
        sql: stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''),
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid,
      })
      totalChanges += result.changes
    }

    return { success: true, database: args.database, results, totalChanges }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function exportDatabase(args: {
  database: string
  format: string
  tables?: string[]
}): Promise<any> {
  try {
    const db = getConnection(args.database)
    const workspacePath = getWorkspacePath()
    const dbFullPath = getDatabasePath(args.database)
    const dbDir = path.dirname(dbFullPath)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dbName = path.basename(args.database)
    const exportPath = path.join(dbDir, `${dbName}_export_${timestamp}.${args.format}`)

    const allTables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_metadata'",
      )
      .all() as Array<{ name: string }>

    const tablesToExport = args.tables
      ? allTables.filter((t) => args.tables!.includes(t.name))
      : allTables

    let exportContent: string

    if (args.format === 'json') {
      const data: any = {
        database: args.database,
        exportedAt: new Date().toISOString(),
        tables: {},
      }
      for (const table of tablesToExport) {
        data.tables[table.name] = db.prepare(`SELECT * FROM '${table.name}'`).all()
      }
      exportContent = JSON.stringify(data, null, 2)
    } else if (args.format === 'csv') {
      const csvParts: string[] = []
      for (const table of tablesToExport) {
        const rows = db.prepare(`SELECT * FROM '${table.name}'`).all() as Record<string, any>[]
        if (rows.length > 0) {
          const columns = Object.keys(rows[0]!)
          csvParts.push(`# Table: ${table.name}`)
          csvParts.push(columns.join(','))
          for (const row of rows) {
            const values = columns.map((col) => {
              const val = row[col]
              if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`
              return val ?? ''
            })
            csvParts.push(values.join(','))
          }
          csvParts.push('')
        }
      }
      exportContent = csvParts.join('\n')
    } else {
      const sqlParts: string[] = [
        `-- SQLite Database Export`,
        `-- Database: ${args.database}`,
        `-- Exported: ${new Date().toISOString()}`,
        '',
      ]

      for (const table of tablesToExport) {
        const createStmt = db
          .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
          .get(table.name) as { sql: string } | undefined
        if (createStmt) {
          sqlParts.push(createStmt.sql + ';')
          sqlParts.push('')
          const rows = db.prepare(`SELECT * FROM '${table.name}'`).all() as Record<string, any>[]
          for (const row of rows) {
            const columns = Object.keys(row)
            const values = columns.map((col) => {
              const val = row[col]
              if (val === null) return 'NULL'
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
              return val
            })
            sqlParts.push(
              `INSERT INTO '${table.name}' (${columns.join(', ')}) VALUES (${values.join(', ')});`,
            )
          }
          sqlParts.push('')
        }
      }
      exportContent = sqlParts.join('\n')
    }

    await fsPromises.writeFile(exportPath, exportContent)
    const stats = await fsPromises.stat(exportPath)
    const relativePath = path.relative(workspacePath, exportPath)

    return {
      success: true,
      database: args.database,
      export: {
        path: relativePath,
        format: args.format,
        tables: tablesToExport.map((t) => t.name),
        sizeBytes: stats.size,
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// JSON-RPC handling
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
})

function sendResponse(response: any) {
  console.log(JSON.stringify(response))
}

const SQLITE_TOOL_HANDLERS: Record<string, (args: any) => Promise<any>> = {
  list_databases: async () => listDatabases(),
  create_database: async (args) => createDatabase(args),
  schema_info: async (args) => schemaInfo(args),
  query: async (args) => queryDatabase(args),
  execute: async (args) => executeStatements(args),
  export_database: async (args) => exportDatabase(args),
}

const MCP_JSONRPC_METHOD_HANDLERS: Record<string, (request: any) => void | Promise<void>> = {
  initialize: (request) => {
    sendResponse({
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {}, prompts: {}, resources: {} },
        serverInfo: { name: 'sqlite-tools', version: '3.0.0' },
      },
    })
  },
  initialized: () => {},
  'tools/list': (request) => {
    sendResponse({
      jsonrpc: '2.0',
      id: request.id,
      result: { tools },
    })
  },
  close: () => process.exit(0),
}

async function handleToolsCall(request: any): Promise<void> {
  const { name, arguments: args } = request.params

  try {
    const handler = SQLITE_TOOL_HANDLERS[name]
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`)
    }
    const result = await handler(args)

    sendResponse({
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      },
    })
  } catch (error) {
    sendResponse({
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Tool execution failed',
      },
    })
  }
}

async function handleRequest(request: any): Promise<void> {
  try {
    if (request.method === 'tools/call') {
      await handleToolsCall(request)
      return
    }

    const methodHandler = MCP_JSONRPC_METHOD_HANDLERS[request.method]
    if (methodHandler) {
      await methodHandler(request)
      return
    }

    sendResponse({
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32601,
        message: `Method not found: ${request.method}`,
      },
    })
  } catch (error) {
    sendResponse({
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}

let buffer = ''
rl.on('line', (line) => {
  buffer += line

  try {
    const request = JSON.parse(buffer)
    buffer = ''
    handleRequest(request)
  } catch (e) {
    if (buffer.length > 100000) {
      process.stderr.write('Buffer overflow, clearing\n')
      buffer = ''
    }
  }
})

process.on('SIGTERM', () => process.exit(0))
process.on('SIGINT', () => process.exit(0))

process.stderr.write('SQLite Tools MCP Server v3.0.0 started\n')
