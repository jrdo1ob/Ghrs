import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware: session management + route protection + role enforcement
 *
 * Addresses:
 * - AUDIT-001: middleware-level role enforcement for GHRS member sessions
 * - AUDIT-002: complete protected route coverage
 *
 * Design:
 * - Page routes enforce authentication + role
 * - API routes (/api/*) are excluded from middleware role enforcement
 *   (APIs have their own server-side authorization via validateSession/validateRequestAuth)
 * - Public routes are always accessible
 * - Child-only routes restrict parent access
 * - Parent-only routes restrict child access
 */

// ─── Route Classification ────────────────────────────────────────────

const parentOnlyRoutes = [
  '/dashboard',
  '/children',
  '/tasks',
  '/rewards',
  '/payments',
  '/achievements',
  '/quran',
  '/settings',
  '/approvals',
  '/stories',
  '/activity',
  '/ledger',
  '/presets',
  '/reward-bank',
  '/gift-approvals',
  '/analytics',
  '/notifications',
];

const childOnlyRoutes = ['/child-mode'];

const publicRoutes = [
  '/',
  '/owner-login',
  '/owner-signup',
  '/family-login',
  '/family-setup',
  '/auth',
];

// ─── Role Resolution ─────────────────────────────────────────────────

type MemberRole = 'owner' | 'parent' | 'child';

/**
 * Resolve the GHRS member role from the request.
 * Returns null if role cannot be determined (treat as unauthenticated for protected routes).
 */
async function resolveMemberRole(
  request: NextRequest,
  isAuthedViaSupabase: boolean,
  isAuthedViaMemberSession: boolean
): Promise<MemberRole | null> {
  // For Supabase Auth sessions: look up role via auth_identities + members
  if (isAuthedViaSupabase) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey) return null;

      const srv = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // We need the Supabase user ID — extract from the cookie session
      // The Supabase client already validated the session, so we can get the user
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll() {},
          },
        }
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: identity } = await srv
        .from('auth_identities')
        .select('member_id')
        .eq('auth_user_id', user.id)
        .limit(1)
        .single();

      if (!identity) return null;

      const { data: member } = await srv
        .from('members')
        .select('role')
        .eq('id', identity.member_id)
        .single();

      return (member?.role as MemberRole) || null;
    } catch {
      return null;
    }
  }

  // For GHRS member sessions: validate via RPC
  if (isAuthedViaMemberSession) {
    try {
      const sessionToken = request.cookies.get('ghrs_member_session')?.value;
      if (!sessionToken) return null;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey) return null;

      const srv = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: sessionData } = await srv.rpc('validate_member_session', {
        p_session_token: sessionToken,
      });

      if (!sessionData || sessionData.length === 0) return null;

      return ((sessionData[0] as any).member_role as MemberRole) || null;
    } catch {
      return null;
    }
  }

  return null;
}

// ─── Main Middleware ──────────────────────────────────────────────────

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check for member session cookie (code+PIN login)
  const memberSession = request.cookies.get('ghrs_member_session')?.value;

  const isAuthedViaSupabase = !!user;
  const isAuthedViaMemberSession = !!memberSession;
  const isAuthed = isAuthedViaSupabase || isAuthedViaMemberSession;

  const pathname = request.nextUrl.pathname;

  // Skip role enforcement for API routes — they have their own server-side authorization
  const isApiRoute = pathname.startsWith('/api/') || pathname === '/auth/callback';

  const isParentOnly = parentOnlyRoutes.some((route) => pathname.startsWith(route));
  const isChildOnly = childOnlyRoutes.some((route) => pathname.startsWith(route));
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  // ─── Authentication check ──────────────────────────────────────
  if ((isParentOnly || isChildOnly) && !isAuthed) {
    const url = request.nextUrl.clone();
    url.pathname = '/owner-login';
    return NextResponse.redirect(url);
  }

  // ─── Role enforcement (page routes only, not API routes) ───────
  if (!isApiRoute && (isParentOnly || isChildOnly) && isAuthed) {
    const role = await resolveMemberRole(request, isAuthedViaSupabase, isAuthedViaMemberSession);

    if (role) {
      // Child trying to access parent-only route → redirect to child-mode
      if (isParentOnly && role === 'child') {
        const url = request.nextUrl.clone();
        url.pathname = '/child-mode';
        return NextResponse.redirect(url);
      }

      // Parent/owner trying to access child-only route → redirect to dashboard
      if (isChildOnly && (role === 'parent' || role === 'owner')) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
