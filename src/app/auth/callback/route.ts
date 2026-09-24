import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getClientIp } from '@/lib/auth/ip';
import { logError, logAuthSuccess, logAuthFailure } from '@/lib/logger';

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

  logAuthSuccess('auth.oauth.callback.received');

  // Handle OAuth errors
  if (error) {
    const errorMessage = errorDescription || error;
    logAuthFailure('auth.oauth.error', { reason: errorMessage });
    return NextResponse.redirect(
      `${origin}/owner-login?error=${encodeURIComponent('حدث خطأ أثناء المصادقة')}`
    );
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
        logError('auth.rate_limit.error', 'Rate limit check failed', { ip });
        return new NextResponse('Service temporarily unavailable', { status: 503 });
      }

      const limitResult = Array.isArray(limitData) ? limitData[0] : limitData;
      if (!limitResult.allowed) {
        logAuthFailure('auth.rate_limit.exceeded', { ip });
        return new NextResponse('Too many requests', {
          status: 429,
          headers: { 'Retry-After': String(limitResult.retry_after ?? 0) },
        });
      }
    } catch {
      logError('auth.rate_limit.exception', 'Rate limit check threw exception', { ip });
      return new NextResponse('Service temporarily available', { status: 503 });
    }

    const supabase = await createClient();

    logAuthSuccess('auth.oauth.exchange_started');
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      // Server-side: log the full error for diagnostics
      logError('auth.oauth.exchange_failed', exchangeError.message);

      // Client-side: return SAFE generic error (no internal details)
      return NextResponse.redirect(
        `${origin}/owner-login?error=${encodeURIComponent('فشل في تبديل كود المصادقة')}`
      );
    }

    logAuthSuccess('auth.oauth.exchange_succeeded');

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
        logError('auth.oauth.identity_missing', 'No member identity found for OAuth user');
        return NextResponse.redirect(`${origin}/family-setup`);
      }

      // Create internal user_sessions record using the new RPC
      const { data: sessionToken, error: sessionError } = await srv.rpc('create_oauth_session', {
        p_member_id: identity.member_id,
      });

      if (sessionError || !sessionToken) {
        logError(
          'auth.oauth.session_create_failed',
          sessionError?.message || 'Session creation failed',
          {
            member_id: identity.member_id,
          }
        );
        return NextResponse.redirect(
          `${origin}/owner-login?error=${encodeURIComponent('فشل إنشاء الجلسة')}`
        );
      }

      logAuthSuccess('auth.login.success', { member_id: identity.member_id, via: 'oauth' });

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
