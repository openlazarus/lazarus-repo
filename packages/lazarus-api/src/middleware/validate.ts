import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { ValidationError } from '@errors/api-errors'

function handleZodError(error: unknown): never {
  if (error instanceof ZodError) {
    throw new ValidationError(
      'Validation failed',
      error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    )
  }
  throw error
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      handleZodError(error)
    }
  }
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any
      next()
    } catch (error) {
      handleZodError(error)
    }
  }
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any
      next()
    } catch (error) {
      handleZodError(error)
    }
  }
}

interface ValidationSchemas {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

export function validateSchema(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body)
      if (schemas.query) req.query = schemas.query.parse(req.query) as any
      if (schemas.params) req.params = schemas.params.parse(req.params) as any
      next()
    } catch (error) {
      handleZodError(error)
    }
  }
}
