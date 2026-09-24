import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// P0.2: Account-based rate limit AFTER authentication.
// Authenticated user ID is available from getUser() — used as the rate limit key.
// Scope 'family-setup:3600s' encodes the 1-hour window.
const RATE_LIMIT_SCOPE = 'family-setup:3600s';
const RATE_LIMIT_WINDOW_SECONDS = 3600; // 1 hour
const RATE_LIMIT_MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    // 1. Validate the Supabase Auth session server-side (Owner is signed in via Supabase Auth)
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    // 2. Durable rate limit by authenticated account (fail-closed: 503 if limiter fails)
    const admin = createServiceRoleClient();

    try {
      const { data: limitData, error: limitError } = await admin.rpc('check_rate_limit', {
        p_scope: RATE_LIMIT_SCOPE,
        p_key: user.id,
        p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
        p_max_attempts: RATE_LIMIT_MAX_ATTEMPTS,
      });

      if (limitError) {
        console.error('[GHRS FAMILY SETUP] Rate limit check failed:', limitError.message);
        return NextResponse.json(
          { success: false, error: 'Service temporarily unavailable' },
          { status: 503 }
        );
      }

      const limitResult = Array.isArray(limitData) ? limitData[0] : limitData;
      if (!limitResult.allowed) {
        return NextResponse.json(
          { success: false, error: 'Too many attempts. Please try again later.' },
          {
            status: 429,
            headers: { 'Retry-After': String(limitResult.retry_after ?? 0) },
          }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // 3. Parse request body (family name + owner name only - nothing security-sensitive)
    const { family_name, owner_name } = await request.json();

    if (!family_name || !owner_name) {
      return NextResponse.json({ success: false, error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    // 4. Perform atomic family setup via the SECURITY DEFINER RPC.
    //    The RPC creates the family, owner member, and auth identity in a
    //    single transaction, so concurrent setup for the same auth user
    //    cannot leave an orphan family/member behind.
    const { data, error } = await admin.rpc('setup_family', {
      p_auth_user_id: user.id,
      p_family_name: family_name,
      p_owner_name: owner_name,
    });

    if (error) {
      console.error('[GHRS FAMILY SETUP] RPC error:', error.message);
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result || result.success !== true) {
      console.error('[GHRS FAMILY SETUP] Unexpected RPC result:', result);
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
    }

    if (result.already_exists) {
      return NextResponse.json({ success: true, message: 'العائلة موجودة بالفعل' });
    }

    return NextResponse.json({ success: true, message: 'تم إنشاء العائلة بنجاح' });
  } catch (err) {
    console.error('[GHRS FAMILY SETUP] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
