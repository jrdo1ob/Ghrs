import { NextResponse, type NextRequest } from 'next/server'
import { validateRequestAuth } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  try {
    // Validate against BOTH session types:
    //  1. GHRS internal session (HttpOnly ghrs_member_session cookie — code+PIN login)
    //  2. Supabase Auth session (owner email/password or OAuth login)
    const result = await validateRequestAuth(request)

    if (!result.success || !result.member) {
      return NextResponse.json(
        { success: false, error: result.error || 'No session found' },
        { status: result.status || 401 }
      )
    }

    return NextResponse.json({
      success: true,
      via: result.via,
      member: {
        member_id: result.member.member_id,
        name: result.member.member_name,
        role: result.member.member_role,
        family_id: result.member.family_id,
      },
    })
  } catch (err) {
    console.error('[GHRS VALIDATE SESSION] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Session validation failed' },
      { status: 500 }
    )
  }
}