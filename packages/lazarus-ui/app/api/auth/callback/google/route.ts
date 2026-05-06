import axios from 'axios'
import { NextResponse } from 'next/server'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json(
      { error: 'Authorization code is required' },
      { status: 400 },
    )
  }

  try {
    const response = await axios.post(GOOGLE_TOKEN_URL, {
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    })

    const { access_token } = response.data

    // Redirect to your calendar page with the token
    return NextResponse.redirect(
      new URL(`/test/calendar?token=${access_token}`, request.url),
    )
  } catch (error) {
    console.error('Error exchanging code for token:', error)
    // Redirect to an error page or handle error appropriately
    return NextResponse.redirect(
      new URL('/test/calendar?error=auth_failed', request.url),
    )
  }
}

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 },
      )
    }

    // Add redirect_uri to the token request
    const tokenRequestData = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }

    const response = await axios.post(
      GOOGLE_TOKEN_URL,
      new URLSearchParams(tokenRequestData as Record<string, string>), // Use URLSearchParams instead of JSON
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', // Change content type
        },
      },
    )

    const { access_token, refresh_token, expires_in } = response.data

    return NextResponse.json({
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000,
    })
  } catch (error: any) {
    // Improved error logging
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      config: error.config,
    })

    return NextResponse.json(
      {
        error: 'Failed to exchange code for token',
        details: error.response?.data || error.message,
      },
      { status: 500 },
    )
  }
}
