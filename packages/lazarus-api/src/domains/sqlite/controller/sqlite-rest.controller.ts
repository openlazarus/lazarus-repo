import { Request, Response } from 'express'
import Database from 'better-sqlite3'
import * as fs from 'fs'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'
import { resolveSecureDatabasePath } from '@utils/sqlite-path'
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from '@errors/api-errors'

const connections = new Map<string, Database.Database>()

async function getWorkspaceDatabasePath(workspaceId: string, dbPath: string): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(workspaceId)) {
    throw new BadRequestError('Invalid workspace ID')
  }

  const workspace = await workspaceRepository.findWorkspaceById(workspaceId)

  if (!workspace) {
    throw new NotFoundError('Workspace', workspaceId)
  }

  const settings = workspace.settings as Record<string, any> | null
  if (!settings?.path) {
    throw new BadRequestError(`Workspace ${workspaceId} has no path configured`)
  }

  return resolveSecureDatabasePath(settings.path, dbPath)
}

function getConnection(fullPath: string): Database.Database {
  if (!connections.has(fullPath)) {
    const db = new Database(fullPath)
    db.pragma('journal_mode = WAL')
    connections.set(fullPath, db)
  }

  return connections.get(fullPath)!
}

function containsDDL(sql: string): boolean {
  const trimmedSql = sql.trim().toUpperCase()
  const ddlKeywords = ['CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'RENAME']
  return ddlKeywords.some((keyword) => trimmedSql.startsWith(keyword))
}

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(tableName)
  return result !== undefined
}

function executeWithTimeout<T>(fn: () => T, timeoutMs: number = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Query timeout exceeded'))
    }, timeoutMs)

    try {
      const result = fn()
      clearTimeout(timer)
      resolve(result)
    } catch (error) {
      clearTimeout(timer)
      reject(error)
    }
  })
}

class SqliteRestController {
  async getSchema(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const dbName = req.params.dbName!
    const { workspaceContext } = req

    if (!workspaceContext) {
      throw new UnauthorizedError('Unauthorized', 'Invalid or missing API key')
    }

    const fullPath = await getWorkspaceDatabasePath(workspaceId, dbName)

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Database', dbName)
    }

    const db = getConnection(fullPath)

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>

    const schema: any = {
      database: dbName,
      tables: [],
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

    return res.json({
      success: true,
      schema,
    })
  }

  async query(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const dbName = req.params.dbName!
    const { workspaceContext } = req

    if (!workspaceContext) {
      throw new UnauthorizedError('Unauthorized', 'Invalid or missing API key')
    }

    const body = req.body
    const sql = body.sql || body.query!
    const params = body.params

    if (containsDDL(sql)) {
      throw new ForbiddenError(
        'Forbidden',
        'DDL operations (CREATE, ALTER, DROP, etc.) are not allowed',
      )
    }

    const trimmedSql = sql.trim().toUpperCase()
    if (!trimmedSql.startsWith('SELECT')) {
      throw new ForbiddenError(
        'Forbidden',
        'Only SELECT queries are allowed. Use CRUD endpoints for data modification.',
      )
    }

    const fullPath = await getWorkspaceDatabasePath(workspaceId, dbName)

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Database', dbName)
    }

    const db = getConnection(fullPath)

    let rows: any[]
    try {
      rows = await executeWithTimeout(() => db.prepare(sql).all(params || []), 10000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const isSyntaxError =
        errorMessage.toLowerCase().includes('syntax error') ||
        errorMessage.toLowerCase().includes('near') ||
        errorMessage.toLowerCase().includes('no such column') ||
        errorMessage.toLowerCase().includes('no such table')

      if (isSyntaxError) {
        throw new BadRequestError('Invalid SQL query', errorMessage)
      }

      throw new InternalServerError(errorMessage)
    }

    if (rows.length > 10000) {
      throw new BadRequestError(
        'Result set too large',
        'Query returned more than 10000 rows. Please use pagination.',
      )
    }

    return res.json({
      success: true,
      data: rows,
      count: rows.length,
    })
  }

  async listRecords(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const dbName = req.params.dbName!
    const table = req.params.table!
    const { workspaceContext } = req

    if (!workspaceContext) {
      throw new UnauthorizedError('Unauthorized', 'Invalid or missing API key')
    }

    const limit = parseInt(req.query.limit as string) || 100
    const offset = parseInt(req.query.offset as string) || 0
    const orderBy = (req.query.orderBy as string) || undefined
    const where = (req.query.where as string) || undefined

    if (limit > 10000) {
      throw new BadRequestError('Limit too large', 'Maximum limit is 10000 rows')
    }

    const fullPath = await getWorkspaceDatabasePath(workspaceId, dbName)

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Database', dbName)
    }

    const db = getConnection(fullPath)

    if (!tableExists(db, table)) {
      throw new NotFoundError('Table', table)
    }

    let sql = `SELECT * FROM '${table}'`

    if (where) {
      sql += ` WHERE ${where}`
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`
    }

    sql += ` LIMIT ${limit} OFFSET ${offset}`

    const rows = await executeWithTimeout(() => db.prepare(sql).all(), 10000)

    let countSql = `SELECT COUNT(*) as count FROM '${table}'`
    if (where) {
      countSql += ` WHERE ${where}`
    }
    const countResult = db.prepare(countSql).get() as { count: number }

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: countResult.count,
        limit,
        offset,
        hasMore: offset + rows.length < countResult.count,
      },
    })
  }

  async getRecord(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const dbName = req.params.dbName!
    const table = req.params.table!
    const id = req.params.id!
    const { workspaceContext } = req

    if (!workspaceContext) {
      throw new UnauthorizedError('Unauthorized', 'Invalid or missing API key')
    }

    const fullPath = await getWorkspaceDatabasePath(workspaceId, dbName)

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Database', dbName)
    }

    const db = getConnection(fullPath)

    if (!tableExists(db, table)) {
      throw new NotFoundError('Table', table)
    }

    const idColumn = (req.query.idColumn as string) || 'id'
    const sql = `SELECT * FROM '${table}' WHERE ${idColumn} = ?`

    const row = await executeWithTimeout(() => db.prepare(sql).get(id), 10000)

    if (!row) {
      throw new NotFoundError('Record', id)
    }

    return res.json({
      success: true,
      data: row,
    })
  }

  async createRecord(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const dbName = req.params.dbName!
    const table = req.params.table!
    const { workspaceContext } = req
    const data = req.body

    if (!workspaceContext) {
      throw new UnauthorizedError('Unauthorized', 'Invalid or missing API key')
    }

    if (!data || typeof data !== 'object') {
      throw new BadRequestError('Invalid request body', 'Expected an object with column values')
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError('Invalid request body', 'Request body cannot be empty')
    }

    const fullPath = await getWorkspaceDatabasePath(workspaceId, dbName)

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Database', dbName)
    }

    const db = getConnection(fullPath)

    if (!tableExists(db, table)) {
      throw new NotFoundError('Table', table)
    }

    const columns = Object.keys(data)
    const placeholders = columns.map(() => '?').join(', ')
    const values = columns.map((col) => data[col])

    const sql = `INSERT INTO '${table}' (${columns.join(', ')}) VALUES (${placeholders})`

    const result = await executeWithTimeout(() => db.prepare(sql).run(...values), 10000)

    return res.status(201).json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        changes: result.changes,
      },
    })
  }

  async updateRecord(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const dbName = req.params.dbName!
    const table = req.params.table!
    const id = req.params.id!
    const { workspaceContext } = req
    const data = req.body

    if (!workspaceContext) {
      throw new UnauthorizedError('Unauthorized', 'Invalid or missing API key')
    }

    if (!data || typeof data !== 'object') {
      throw new BadRequestError('Invalid request body', 'Expected an object with column values')
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError('Invalid request body', 'Request body cannot be empty')
    }

    const fullPath = await getWorkspaceDatabasePath(workspaceId, dbName)

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Database', dbName)
    }

    const db = getConnection(fullPath)

    if (!tableExists(db, table)) {
      throw new NotFoundError('Table', table)
    }

    const columns = Object.keys(data)
    const setClause = columns.map((col) => `${col} = ?`).join(', ')
    const values = columns.map((col) => data[col])

    const idColumn = (req.query.idColumn as string) || 'id'
    const sql = `UPDATE '${table}' SET ${setClause} WHERE ${idColumn} = ?`

    const result = await executeWithTimeout(() => db.prepare(sql).run(...values, id), 10000)

    if (result.changes === 0) {
      throw new NotFoundError('Record', id)
    }

    return res.json({
      success: true,
      data: {
        changes: result.changes,
      },
    })
  }

  async deleteRecord(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const dbName = req.params.dbName!
    const table = req.params.table!
    const id = req.params.id!
    const { workspaceContext } = req

    if (!workspaceContext) {
      throw new UnauthorizedError('Unauthorized', 'Invalid or missing API key')
    }

    const fullPath = await getWorkspaceDatabasePath(workspaceId, dbName)

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Database', dbName)
    }

    const db = getConnection(fullPath)

    if (!tableExists(db, table)) {
      throw new NotFoundError('Table', table)
    }

    const idColumn = (req.query.idColumn as string) || 'id'
    const sql = `DELETE FROM '${table}' WHERE ${idColumn} = ?`

    const result = await executeWithTimeout(() => db.prepare(sql).run(id), 10000)

    if (result.changes === 0) {
      throw new NotFoundError('Record', id)
    }

    return res.status(204).json({
      success: true,
      data: {
        changes: result.changes,
      },
    })
  }
}

export const sqliteRestController = new SqliteRestController()
