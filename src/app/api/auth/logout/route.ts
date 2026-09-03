import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    // Get session token from cookie
    const cookieHeader = request.headers.get('cookie') || ''
    const sessionMatch = cookieHeader.match(/ghrs_member_session=([^;]+)/)
    const sessionToken = sessionMatch?.[1]

    if (sessionToken) {
      // Delete session from database
      const supabase = await createClient()
      await supabase.rpc('logout_member_session', {
        p_session_token: sessionToken,
      })
    }

    // Create response
    const response = NextResponse.json({ success: true })

    // Clear session cookie
    response.cookies.set('ghrs_member_session', '', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
    })

    return response
  } catch (err) {
    console.error('[GHRS LOGOUT] Unexpected error:', err)
    // Still clear cookie even if database operation fails
    const response = NextResponse.json({ success: true })
    response.cookies.set('ghrs_member_session', '', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
    })
    return response
  }
}