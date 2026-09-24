import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getClientIp } from '@/lib/auth/ip';
import { logError, logAuthSuccess, logAuthFailure } from '@/lib/logger';

// P0.2: Durable rate limiting replaces in-memory limiter.
// Scope 'member-login:300s' encodes the 5-minute window to prevent collisions.
const RATE_LIMIT_SCOPE = 'member-login:300s';
const RATE_LIMIT_WINDOW_SECONDS = 300; // 5 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 30;

export async function POST(request: Request) {
  try {
    const { loginCode, pin } = await request.json();

    // Validate input
    if (!loginCode || !pin) {
      logAuthFailure('auth.login.missing_input');
      return NextResponse.json({ success: false, error: 'الكود والرمز مطلوبان' }, { status: 400 });
    }

    // Durable rate limit (fail-closed: 503 if limiter cannot be evaluated)
    const ip = getClientIp(request);
    const supabase = createServiceRoleClient();

    let limited = false;
    let retryAfter = 0;

    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_scope: RATE_LIMIT_SCOPE,
        p_key: ip,
        p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
        p_max_attempts: RATE_LIMIT_MAX_ATTEMPTS,
      });

      if (error) {
        logError('auth.rate_limit.error', 'Rate limit check failed', { ip });
        return NextResponse.json(
          { success: false, error: 'Service temporarily unavailable' },
          { status: 503 }
        );
      }

      const result = Array.isArray(data) ? data[0] : data;
      limited = !result.allowed;
      retryAfter = result.retry_after ?? 0;
    } catch {
      logError('auth.rate_limit.exception', 'Rate limit check threw exception', { ip });
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    if (limited) {
      logAuthFailure('auth.login.rate_limited', { ip });
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }

    // Call login RPC using service-role client (bypasses RLS, required after REVOKE)
    const { data, error } = await supabase.rpc('login_with_code_and_pin', {
      p_login_code: loginCode.toUpperCase(),
      p_pin: pin,
    });

    if (error) {
      logAuthFailure('auth.login.rpc_error', { reason: 'invalid_credentials' });
      return NextResponse.json(
        { success: false, error: 'الكود أو الرمز غير صحيح' },
        { status: 401 }
      );
    }

    if (!data || data.length === 0) {
      logAuthFailure('auth.login.no_result', { reason: 'empty_rpc_result' });
      return NextResponse.json(
        { success: false, error: 'الكود أو الرمز غير صحيح' },
        { status: 401 }
      );
    }

    const sessionData = data[0];
    const sessionToken = sessionData.session_token;
    const memberRole = sessionData.member_role;
    const memberName = sessionData.member_name;

    logAuthSuccess('auth.login.success', {
      member_id: sessionData.member_id,
      role: memberRole,
      via: 'code_pin',
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      role: memberRole,
      name: memberName,
    });

    // Set httpOnly cookie with session token
    // Browser cannot read this cookie — only server can
    response.cookies.set('ghrs_member_session', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err) {
    logError('auth.login.unexpected', 'Unexpected login error');
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
