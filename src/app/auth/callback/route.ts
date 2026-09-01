import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    return NextResponse.redirect(
      `${origin}/owner-login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (code) {
    const supabase = await createClient()

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        `${origin}/owner-login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    if (data?.user) {
      const { data: identity } = await supabase
        .from('auth_identities')
        .select('member_id')
        .eq('auth_user_id', data.user.id)
        .single()

      const response = NextResponse.redirect(`${origin}${identity ? '/dashboard' : '/family-setup'}`)

      return response
    }
  }

  return NextResponse.redirect(
    `${origin}/owner-login?error=${encodeURIComponent('لم يتم استلام كود المصادقة')}`
  )
}
