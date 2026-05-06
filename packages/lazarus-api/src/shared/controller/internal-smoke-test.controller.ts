import { Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@infrastructure/database/supabase'
import { createLogger } from '@utils/logger'
import { NotFoundError, InternalServerError } from '@errors/api-errors'

const log = createLogger('smoke-test')

function createIsolatedClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

class InternalSmokeTestController {
  async impersonate(req: Request, res: Response) {
    try {
      let { email, userId } = req.body

      if (userId && !email) {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
        if (userError || !userData?.user?.email) {
          log.warn({ userId, error: userError }, 'Failed to resolve user by ID')
          throw new NotFoundError('User', userId)
        }
        email = userData.user.email
        userId = userData.user.id
      }

      const isolatedClient = createIsolatedClient()

      const { data: linkData, error: linkError } = await isolatedClient.auth.admin.generateLink({
        type: 'magiclink',
        email: email!,
      })

      if (linkError || !linkData?.properties?.hashed_token) {
        log.error({ email, error: linkError }, 'Failed to generate magic link')
        throw new InternalServerError('Failed to generate auth link')
      }

      const { data: sessionData, error: sessionError } = await isolatedClient.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'magiclink',
      })

      if (sessionError || !sessionData?.session) {
        log.error({ email, error: sessionError }, 'Failed to verify OTP')
        throw new InternalServerError('Failed to create session')
      }

      const resolvedUserId = sessionData.user?.id || userId

      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id, name, slug, description, is_default')
        .eq('user_id', resolvedUserId!)
        .is('deleted_at', null)
        .order('is_default', { ascending: false })

      const { data: teamMemberships } = await supabase
        .from('workspace_members')
        .select('role, workspace:workspaces(id, name, slug)')
        .eq('user_id', resolvedUserId!)

      const teams = (teamMemberships || [])
        .filter((tm: any) => tm.workspace)
        .map((tm: any) => ({
          id: tm.workspace.id,
          name: tm.workspace.name,
          slug: tm.workspace.slug,
          role: tm.role,
        }))

      log.info({ email, userId: resolvedUserId }, 'Impersonation token generated')

      return res.json({
        success: true,
        token: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
        user: {
          id: sessionData.user?.id,
          email: sessionData.user?.email,
        },
        workspaces: workspaces || [],
        teams,
      })
    } catch (err) {
      log.error({ err }, 'Impersonation failed')
      throw err
    }
  }
}

export const internalSmokeTestController = new InternalSmokeTestController()
