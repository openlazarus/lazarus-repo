import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/utils/supabase/middleware'

const publicRoutes = [
  '/test',
  '/test/lexical-diff',
  '/test/lexical-diff-integrated',
  '/test/transcription-openai',
  '/test/transcription-deepgram',
  '/signin',
  '/privacy',
  '/terms',
  '/careers',
  '/about',
  '/think',
  '/dev',
]

/** Routes matched by prefix — any path starting with these is public */
const publicPrefixes = ['/api/auth/callback', '/api/agents']

/**
 * Proxy function to handle authentication and session updates
 *
 * @param {NextRequest} request - The incoming request object
 * @returns {Promise<NextResponse>} The response object after processing
 */
export async function proxy(request: NextRequest) {
  // Allow access to public routes without authentication
  const pathname = request.nextUrl.pathname
  if (
    publicRoutes.includes(pathname) ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next()
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
