/**
 * Script to generate invite codes for the waitlist
 * Run with: npx tsx scripts/generate-invite-code.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface GenerateCodeOptions {
  expiresInDays?: number
  maxUses?: number
  createdBy?: string
}

async function generateInviteCode(options: GenerateCodeOptions = {}) {
  const { expiresInDays = 30, maxUses = 1, createdBy = null } = options

  try {
    // Generate the code using the database function
    const { data: codeData, error: codeError } = await supabase.rpc(
      'generate_invite_code',
    )

    if (codeError) {
      throw codeError
    }

    const code = codeData as string

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Insert the invite code
    const { data, error } = await supabase
      .from('invite_codes')
      .insert({
        code,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses,
        created_by: createdBy,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    console.log('\n✅ Invite code generated successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Code:        ${code}`)
    console.log(`Expires:     ${expiresAt.toLocaleDateString()}`)
    console.log(`Max uses:    ${maxUses}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return data
  } catch (error) {
    console.error('Error generating invite code:', error)
    throw error
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const options: GenerateCodeOptions = {}

for (let i = 0; i < args.length; i += 2) {
  const flag = args[i]
  const value = args[i + 1]

  switch (flag) {
    case '--expires':
      options.expiresInDays = parseInt(value, 10)
      break
    case '--max-uses':
      options.maxUses = parseInt(value, 10)
      break
    case '--created-by':
      options.createdBy = value
      break
    case '--count':
      // Generate multiple codes
      const count = parseInt(value, 10)
      ;(async () => {
        console.log(`\nGenerating ${count} invite codes...\n`)
        for (let j = 0; j < count; j++) {
          await generateInviteCode(options)
        }
      })()
      process.exit(0)
      break
  }
}

// Generate a single code if no --count flag
generateInviteCode(options)
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
