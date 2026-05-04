import express, { Request } from 'express'

/**
 * JSON parser that preserves raw body on the request for webhook signature verification.
 */
export function jsonWithRawBody() {
  return express.json({
    limit: '5mb',
    verify: (req: Request, _res, buf) => {
      const url = req.url || ''
      if (
        url.includes('/webhooks/slack') ||
        url.includes('/stripe/webhooks') ||
        url.includes('/whatsapp/webhook') ||
        url.includes('/whatsapp/global') ||
        url.includes('/hooks/')
      ) {
        req.rawBody = buf.toString('utf8')
      }
    },
  })
}

/**
 * URL-encoded parser that preserves raw body for Slack webhook verification.
 */
export function urlencodedWithRawBody() {
  return express.urlencoded({
    extended: true,
    limit: '5mb',
    verify: (req: Request, _res, buf) => {
      const url = req.url || ''
      if (url.includes('/webhooks/slack')) {
        req.rawBody = buf.toString('utf8')
      }
    },
  })
}
