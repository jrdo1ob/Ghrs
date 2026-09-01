import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check for member session cookie (code+PIN login)
  const memberSession = request.cookies.get('ghrs_member_session')?.value

  const isAuthedViaSupabase = !!user
  const isAuthedViaMemberSession = !!memberSession
  const isAuthed = isAuthedViaSupabase || isAuthedViaMemberSession

  const protectedRoutes = ['/dashboard', '/children', '/tasks', '/rewards', '/payments', '/achievements', '/quran', '/settings']
  const childRoutes = ['/child-mode']
  const publicRoutes = ['/', '/owner-login', '/owner-signup', '/family-login', '/family-setup', '/auth']

  const pathname = request.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isChildRoute = childRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Redirect unauthenticated users
  if ((isProtectedRoute || isChildRoute) && !isAuthed) {
    const url = request.nextUrl.clone()
    url.pathname = '/owner-login'
    return NextResponse.redirect(url)
  }

  // If authenticated via member session (code+PIN), check role for route access
  if (isAuthedViaMemberSession && !isAuthedViaSupabase) {
    // For child routes, the child should use child_id in localStorage
    // For parent routes, the parent should use parent_id in localStorage
    // The middleware just needs to verify the cookie exists - role checking is done client-side
  }

  return supabaseResponse
}
