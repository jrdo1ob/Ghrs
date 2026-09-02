import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('[GHRS AUTH CALLBACK] callback reached')

  // Handle OAuth errors
  if (error) {
    const errorMessage = errorDescription || error
    console.error('[GHRS AUTH CALLBACK] OAuth error:', errorMessage)
    return NextResponse.redirect(
      `${origin}/owner-login?error=${encodeURIComponent(errorMessage)}`
    )
  }

  // Handle authorization code
  if (code) {
    const supabase = await createClient()

    console.log('[GHRS AUTH CALLBACK] exchangeCodeForSession started')
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[GHRS AUTH CALLBACK] exchangeCodeForSession error:', exchangeError.message)
      return NextResponse.redirect(
        `${origin}/owner-login?error=${encodeURIComponent('فشل في تبديل كود المصادقة: ' + exchangeError.message)}`
      )
    }

    console.log('[GHRS AUTH CALLBACK] exchangeCodeForSession success')

    if (data?.user) {
      // Check if user has a member identity
      const { data: identity, error: identityError } = await supabase
        .from('auth_identities')
        .select('member_id')
        .eq('auth_user_id', data.user.id)
        .single()

      // If user has identity, go to dashboard; otherwise, go to family setup
      const redirectPath = identity ? '/dashboard' : '/family-setup'
      
      const response = NextResponse.redirect(`${origin}${redirectPath}`)
      
      // Set session cookie
      response.cookies.set('ghrs_member_session', data.session.access_token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })

      return response
    }
  }

  // No code or error - redirect to login
  return NextResponse.redirect(
    `${origin}/owner-login?error=${encodeURIComponent('لم يتم استلام كود المصادقة')}`
  )
}
