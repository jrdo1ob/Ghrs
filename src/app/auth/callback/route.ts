import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getClientIp } from '@/lib/auth/ip';

// P0.2: IP-based rate limit BEFORE exchangeCodeForSession.
// Account identity is NOT available before the PKCE exchange.
// Scope 'oauth-callback:300s' encodes the 5-minute window.
const RATE_LIMIT_SCOPE = 'oauth-callback:300s';
const RATE_LIMIT_WINDOW_SECONDS = 300; // 5 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 20;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  console.log('[GHRS AUTH CALLBACK] callback reached');

  // Handle OAuth errors
  if (error) {
    const errorMessage = errorDescription || error;
    console.error('[GHRS AUTH CALLBACK] OAuth error:', errorMessage);
    return NextResponse.redirect(`${origin}/owner-login?error=${encodeURIComponent(errorMessage)}`);
  }

  // Handle authorization code
  if (code) {
    // P0.2: Rate limit BEFORE the expensive PKCE exchange.
    // Identity is not available at this point — IP is the only safe key.
    const ip = getClientIp(request);
    const srvForLimit = createServiceRoleClient();

    try {
      const { data: limitData, error: limitError } = await srvForLimit.rpc('check_rate_limit', {
        p_scope: RATE_LIMIT_SCOPE,
        p_key: ip,
        p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
        p_max_attempts: RATE_LIMIT_MAX_ATTEMPTS,
      });

      if (limitError) {
        console.error('[GHRS AUTH CALLBACK] Rate limit check failed:', limitError.message);
        return new NextResponse('Service temporarily unavailable', { status: 503 });
      }

      const limitResult = Array.isArray(limitData) ? limitData[0] : limitData;
      if (!limitResult.allowed) {
        return new NextResponse('Too many requests', {
          status: 429,
          headers: { 'Retry-After': String(limitResult.retry_after ?? 0) },
        });
      }
    } catch {
      return new NextResponse('Service temporarily unavailable', { status: 503 });
    }

    const supabase = await createClient();

    console.log('[GHRS AUTH CALLBACK] exchangeCodeForSession started');
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[GHRS AUTH CALLBACK] exchangeCodeForSession error:', exchangeError.message);
      return NextResponse.redirect(
        `${origin}/owner-login?error=${encodeURIComponent('فشل في تبديل كود المصادقة: ' + exchangeError.message)}`
      );
    }

    console.log('[GHRS AUTH CALLBACK] exchangeCodeForSession success');

    if (data?.user) {
      // Use service-role client for database queries and RPC calls
      // (anon key no longer has EXECUTE on create_oauth_session after migration 062)
      const srv = createServiceRoleClient();

      // Check if user has a member identity
      const { data: identity, error: identityError } = await srv
        .from('auth_identities')
        .select('member_id')
        .eq('auth_user_id', data.user.id)
        .single();

      if (identityError || !identity?.member_id) {
        console.error('[GHRS AUTH CALLBACK] identity lookup failed:', identityError?.message);
        return NextResponse.redirect(`${origin}/family-setup`);
      }

      // Create internal user_sessions record using the new RPC
      const { data: sessionToken, error: sessionError } = await srv.rpc('create_oauth_session', {
        p_member_id: identity.member_id,
      });

      if (sessionError || !sessionToken) {
        console.error(
          '[GHRS AUTH CALLBACK] Failed to create OAuth session:',
          sessionError?.message
        );
        return NextResponse.redirect(
          `${origin}/owner-login?error=${encodeURIComponent('فشل إنشاء الجلسة')}`
        );
      }

      const response = NextResponse.redirect(`${origin}/dashboard`);

      // Set session cookie with INTERNAL session token (NOT JWT)
      response.cookies.set('ghrs_member_session', sessionToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }
  }

  // No code or error - redirect to login
  return NextResponse.redirect(
    `${origin}/owner-login?error=${encodeURIComponent('لم يتم استلام كود المصادقة')}`
  );
}
