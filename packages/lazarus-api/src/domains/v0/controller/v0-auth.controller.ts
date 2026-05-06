import { Request, Response } from 'express'
import { v0TokenService } from '@domains/v0/service/v0-token.service'
import { UnauthorizedError } from '@errors/api-errors'

class V0AuthController {
  async generateToken(req: Request, res: Response) {
    const userId = req.user!.id
    const workspaceId = req.workspaceId!

    const body = req.body
    const { v0ProjectId, v0AppUrl } = body

    const { token, expiresAt } = v0TokenService.generateToken(userId, workspaceId, v0ProjectId)

    let fullV0AppUrl: string
    if (v0AppUrl) {
      const url = new URL(v0AppUrl)
      url.searchParams.set('lazarus_token', token)
      fullV0AppUrl = url.toString()
    } else {
      fullV0AppUrl = `https://${v0ProjectId}.vercel.app?lazarus_token=${token}`
    }

    return res.json({
      success: true,
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      v0AppUrl: fullV0AppUrl,
    })
  }

  async exchangeToken(req: Request, res: Response) {
    const body = req.body
    const { token } = body

    const tokenData = v0TokenService.validateToken(token)

    if (!tokenData) {
      throw new UnauthorizedError(
        'Invalid or expired token',
        'The authentication token is invalid or has expired. Please try logging in again.',
      )
    }

    return res.json({
      success: true,
      user: {
        id: tokenData.userId,
        workspaceId: tokenData.workspaceId,
        v0ProjectId: tokenData.v0ProjectId,
      },
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  async getStats(_req: Request, res: Response) {
    const stats = v0TokenService.getStats()

    return res.json({
      success: true,
      stats,
    })
  }
}

export const v0AuthController = new V0AuthController()
