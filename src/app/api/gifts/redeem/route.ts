import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { validateSession } from '@/lib/auth/server-session';
import { notifyParents } from '@/lib/notifications/helper';

// L1: Rate limit scope for gift redemption
const RATE_LIMIT_SCOPE = 'gift-redeem:300s';
const RATE_LIMIT_WINDOW_SECONDS = 300;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession(request);
    if (!session.success || !session.member) {
      return NextResponse.json(
        { success: false, error: session.error },
        { status: session.status }
      );
    }

    const member = session.member;

    if (member.member_role !== 'child') {
      return NextResponse.json(
        { success: false, error: 'هذه العملية مخصصة للأطفال فقط' },
        { status: 403 }
      );
    }

    const { gift_id } = await request.json();
    if (!gift_id) {
      return NextResponse.json({ success: false, error: 'معرف الهدية مطلوب' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // L1: Rate limit — keyed by member_id
    const { data: limitData, error: limitError } = await supabase.rpc('check_rate_limit', {
      p_scope: RATE_LIMIT_SCOPE,
      p_key: member.member_id,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      p_max_attempts: RATE_LIMIT_MAX_ATTEMPTS,
    });

    if (limitError) {
      console.error('[GHRS REDEEM GIFT] Rate limit check failed:', limitError.message);
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 503 });
    }

    const limitResult = Array.isArray(limitData) ? limitData[0] : limitData;
    if (!limitResult?.allowed) {
      return NextResponse.json(
        { success: false, error: 'تم تجاوز الحد المسموح' },
        { status: 429, headers: { 'Retry-After': String(limitResult?.retry_after ?? 0) } }
      );
    }

    // Call request_gift_redemption RPC (creates PENDING request, does NOT deduct XP)
    const { data, error } = await supabase.rpc('request_gift_redemption', {
      p_gift_id: gift_id,
      p_member_id: member.member_id,
      p_caller_member_id: member.member_id,
    });

    const result = Array.isArray(data) ? data[0] : data;

    if (error || !result || !result.success) {
      const message = (result && result.message) || error?.message || 'حدث خطأ';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }

    // Notify parents about the gift redemption request
    notifyParents(member.family_id, {
      senderMemberId: member.member_id,
      type: 'gift_request',
      title: 'طلب استبدال هدية',
      body: `طلب ${member.member_name} استبدال هدية`,
      referenceType: 'gift',
      referenceId: gift_id,
    });

    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    console.error('[GHRS REDEEM GIFT] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
