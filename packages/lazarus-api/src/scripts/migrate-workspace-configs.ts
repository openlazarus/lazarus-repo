#!/usr/bin/env node
/**
 * Migration script to create .workspace-config.json files for existing workspaces
 *
 * This script:
 * 1. Fetches all workspaces from Supabase
 * 2. For each workspace, creates a .workspace-config.json with a random slug
 * 3. Skips workspaces that already have a config file
 *
 * Usage:
 *   npm run migrate:workspace-configs
 *   or
 *   npx tsx src/scripts/migrate-workspace-configs.ts
 */

import { createClient } from '@supabase/supabase-js'
import { workspaceConfigService } from '@domains/workspace/service/workspace-config.service'
import path from 'path'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

const STORAGE_BASE = process.env.STORAGE_BASE_PATH ?? './storage'

interface Workspace {
  id: string
  user_id: string
  name: string
  slug: string | null
}

/**
 * Get workspace filesystem path
 */
function getWorkspacePath(userId: string, workspaceId: string): string {
  return path.join(STORAGE_BASE, 'users', userId, 'workspaces', workspaceId)
}

/**
 * Migrate a single workspace
 */
async function migrateWorkspace(workspace: Workspace): Promise<void> {
  const workspacePath = getWorkspacePath(workspace.user_id, workspace.id)

  console.log(`\n[${workspace.id}] Migrating workspace: ${workspace.name}`)
  console.log(`  Path: ${workspacePath}`)

  try {
    // Try to get existing config (will auto-create if missing)
    const config = await workspaceConfigService.getConfig(workspacePath, workspace.id)

    console.log(`  ✓ Config exists with slug: ${config.slug}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`  ✗ Failed to migrate: ${message}`)
    throw error
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('='.repeat(70))
  console.log('Workspace Config Migration')
  console.log('='.repeat(70))
  console.log()

  try {
    // Fetch all workspaces from Supabase
    console.log('Fetching workspaces from database...')
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('id, user_id, name, slug')
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch workspaces: ${error.message}`)
    }

    if (!workspaces || workspaces.length === 0) {
      console.log('No workspaces found.')
      return
    }

    console.log(`Found ${workspaces.length} workspace(s)\n`)

    // Track results
    let successCount = 0
    let errorCount = 0
    const errors: Array<{ workspace: Workspace; error: string }> = []

    // Migrate each workspace
    for (const workspace of workspaces) {
      try {
        await migrateWorkspace(workspace)
        successCount++
      } catch (error) {
        errorCount++
        errors.push({
          workspace,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Print summary
    console.log()
    console.log('='.repeat(70))
    console.log('Migration Summary')
    console.log('='.repeat(70))
    console.log(`Total workspaces: ${workspaces.length}`)
    console.log(`Successful: ${successCount}`)
    console.log(`Failed: ${errorCount}`)

    if (errors.length > 0) {
      console.log('\nErrors:')
      errors.forEach(({ workspace, error }) => {
        console.log(`  - ${workspace.name} (${workspace.id}): ${error}`)
      })
    }

    console.log()

    if (errorCount > 0) {
      process.exit(1)
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('\n❌ Migration failed:', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

// Run migration
migrate()
