import { Router } from 'express'
import { apiKeyAuth } from '@middleware/api-key-auth'
import { validateBody } from '@middleware/validate'
import { QuerySchema } from '../domains/sqlite/types/sqlite.schemas'
import { sqliteRestController } from '@domains/sqlite/controller/sqlite-rest.controller'

const router = Router()

// Apply API key authentication to all routes
router.use(apiKeyAuth)

router.get('/:dbName/schema', (req, res) => sqliteRestController.getSchema(req, res))

router.post('/:dbName/query', validateBody(QuerySchema), (req, res) =>
  sqliteRestController.query(req, res),
)

router.get('/:dbName/:table', (req, res) => sqliteRestController.listRecords(req, res))

router.get('/:dbName/:table/:id', (req, res) => sqliteRestController.getRecord(req, res))

router.post('/:dbName/:table', (req, res) => sqliteRestController.createRecord(req, res))

router.put('/:dbName/:table/:id', (req, res) => sqliteRestController.updateRecord(req, res))

router.delete('/:dbName/:table/:id', (req, res) => sqliteRestController.deleteRecord(req, res))

export default router
