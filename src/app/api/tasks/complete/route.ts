import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// L1: Rate limit scope for child task completion
const RATE_LIMIT_SCOPE = 'task-complete:300s';
const RATE_LIMIT_WINDOW_SECONDS = 300;
const RATE_LIMIT_MAX_ATTEMPTS = 30;

export async function POST(request: NextRequest) {
  try {
    // 1. Read session token from HttpOnly cookie
    const sessionToken = request.cookies.get('ghrs_member_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const { task_id } = await request.json();

    if (!task_id) {
      return NextResponse.json({ success: false, error: 'معرف المهمة مطلوب' }, { status: 400 });
    }

    // 3. Validate session using server-side RPC with service-role client
    const supabase = createServiceRoleClient();

    const { data: sessionData, error: sessionError } = await supabase.rpc(
      'validate_member_session',
      {
        p_session_token: sessionToken,
      }
    );

    if (sessionError || !sessionData || sessionData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'جلسة غير صالحة أو منتهية' },
        { status: 401 }
      );
    }

    const member = sessionData[0];

    // 4. Verify role === 'child'
    if (member.member_role !== 'child') {
      return NextResponse.json(
        { success: false, error: 'هذه العملية مخصصة للأطفال فقط' },
        { status: 403 }
      );
    }

    // 5. Get verified member_id from session (NOT from browser)
    const verifiedMemberId = member.member_id;

    // L1: Rate limit — keyed by member_id (child-specific)
    const { data: limitData, error: limitError } = await supabase.rpc('check_rate_limit', {
      p_scope: RATE_LIMIT_SCOPE,
      p_key: verifiedMemberId,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      p_max_attempts: RATE_LIMIT_MAX_ATTEMPTS,
    });

    if (limitError) {
      console.error('[GHRS COMPLETE TASK] Rate limit check failed:', limitError.message);
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 503 });
    }

    const limitResult = Array.isArray(limitData) ? limitData[0] : limitData;
    if (!limitResult?.allowed) {
      return NextResponse.json(
        { success: false, error: 'تم تجاوز الحد المسموح' },
        { status: 429, headers: { 'Retry-After': String(limitResult?.retry_after ?? 0) } }
      );
    }

    // 6. Call complete_task_with_rewards with verified member_id using service-role client
    const { data, error } = await supabase.rpc('complete_task_with_rewards', {
      p_task_id: task_id,
      p_member_id: verifiedMemberId,
    });

    if (error) {
      // Log detailed error information for debugging
      console.error('[GHRS COMPLETE TASK] RPC ERROR');
      console.error('[GHRS COMPLETE TASK] error.message:', error.message);
      console.error('[GHRS COMPLETE TASK] error.code:', error.code);
      console.error('[GHRS COMPLETE TASK] error.details:', error.details);
      console.error('[GHRS COMPLETE TASK] error.hint:', error.hint);
      console.error('[GHRS COMPLETE TASK] task_id:', task_id);
      console.error('[GHRS COMPLETE TASK] verifiedMemberId:', verifiedMemberId);

      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء إنجاز المهمة' },
        { status: 500 }
      );
    }

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: 'تم إنجاز المهمة بنجاح',
    });
  } catch (err) {
    console.error('[GHRS COMPLETE TASK] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
