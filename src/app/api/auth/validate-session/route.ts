import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Read session token directly from HttpOnly cookie
    // The browser cannot read this cookie - only the server can
    const sessionToken = request.cookies.get('ghrs_member_session')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 401 }
      )
    }

    // Validate session using server-side RPC
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('validate_member_session', {
      p_session_token: sessionToken,
    })

    if (error) {
      console.error('[GHRS VALIDATE SESSION] RPC error:', error.message)
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    const memberData = data[0]

    return NextResponse.json({
      success: true,
      member: {
        member_id: memberData.member_id,
        name: memberData.member_name,
        role: memberData.member_role,
        family_id: memberData.family_id,
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