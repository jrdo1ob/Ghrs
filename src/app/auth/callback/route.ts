import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if user has an existing member
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: identity } = await supabase
          .from('auth_identities')
          .select('member_id')
          .eq('auth_user_id', user.id)
          .single()

        if (identity) {
          // User has existing member, go to dashboard
          return NextResponse.redirect(`${origin}/dashboard`)
        } else {
          // New user, go to family setup
          return NextResponse.redirect(`${origin}/family-setup`)
        }
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/owner-login?error=auth_callback_error`)
}
