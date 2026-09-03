import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { loginCode, pin } = await request.json()

    // Validate input
    if (!loginCode || !pin) {
      return NextResponse.json(
        { success: false, error: 'الكود والرمز مطلوبان' },
        { status: 400 }
      )
    }

    // Call secure login RPC using server-side Supabase client
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('login_with_code_and_pin', {
      p_login_code: loginCode.toUpperCase(),
      p_pin: pin,
    })

    if (error) {
      console.error('[GHRS MEMBER LOGIN] RPC error:', error.message)
      return NextResponse.json(
        { success: false, error: 'الكود أو الرمز غير صحيح' },
        { status: 401 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'الكود أو الرمز غير صحيح' },
        { status: 401 }
      )
    }

    const sessionData = data[0]
    const sessionToken = sessionData.session_token
    const memberRole = sessionData.member_role
    const memberName = sessionData.member_name

    // Create response
    const response = NextResponse.json({
      success: true,
      role: memberRole,
      name: memberName,
    })

    // Set httpOnly cookie with session token
    // Browser cannot read this cookie — only server can
    response.cookies.set('ghrs_member_session', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return response
  } catch (err) {
    console.error('[GHRS MEMBER LOGIN] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    )
  }
}