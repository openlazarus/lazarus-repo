/**
 * Discord Settings Routes
 *
 * API endpoints for managing Discord connection settings,
 * including management capabilities and interaction access.
 */

import { Router } from 'express'
import { discordSettingsController } from '@domains/discord/controller/discord-settings.controller'

const router = Router()

router.get('/discord/:connectionId/settings', (req, res) =>
  discordSettingsController.getSettings(req, res),
)
router.put('/discord/:connectionId/settings', (req, res) =>
  discordSettingsController.updateSettings(req, res),
)
router.get('/discord/:connectionId/guild-roles', (req, res) =>
  discordSettingsController.getGuildRoles(req, res),
)
router.get('/discord/:connectionId/guild-channels', (req, res) =>
  discordSettingsController.getGuildChannels(req, res),
)

export default router
