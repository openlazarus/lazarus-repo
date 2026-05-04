import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    console.log('Received invite code verification request:', code)

    if (!code || code.length !== 6) {
      console.error('Invalid code format:', code)
      return NextResponse.json(
        { success: false, error: 'Invalid invite code format' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    console.log('Supabase client created')

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log('User auth check:', { user: user?.id, authError })

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      )
    }

    // Call the database function to validate and use the invite code
    console.log('Calling use_invite_code RPC with:', { code, userId: user.id })
    const { data, error } = await supabase.rpc('use_invite_code', {
      p_code: code,
      p_user_id: user.id,
    })

    console.log('RPC response:', { data, error })

    if (error) {
      console.error('RPC error validating invite code:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to validate invite code',
        },
        { status: 500 },
      )
    }

    // The RPC function returns a JSONB object with success/error
    if (!data.success) {
      console.log('Code validation failed:', data.error)
      return NextResponse.json(
        { success: false, error: data.error },
        { status: 400 },
      )
    }

    console.log('Code validated successfully')
    return NextResponse.json({
      success: true,
      message: data.message,
    })
  } catch (error) {
    console.error('Unexpected error in verify-invite-code:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    )
  }
}
