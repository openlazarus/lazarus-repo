import axios from 'axios'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { refresh_token } = await request.json()

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 },
      )
    }

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
    })

    const { access_token, expires_in } = response.data

    return NextResponse.json({
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000,
    })
  } catch (error) {
    console.error('Error refreshing token:', error)
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 },
    )
  }
}
