import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { validateSession } from '@/lib/auth/server-session';
import { notifyParents } from '@/lib/notifications/helper';

// L1: Rate limit scope for withdrawal requests
const RATE_LIMIT_SCOPE = 'withdrawal-request:300s';
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

    // Only children can request withdrawals
    if (member.member_role !== 'child') {
      return NextResponse.json(
        { success: false, error: 'هذه العملية مخصصة للأطفال فقط' },
        { status: 403 }
      );
    }

    const { amount } = await request.json();
    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'المبلغ غير صالح' }, { status: 400 });
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
      console.error('[GHRS WITHDRAWAL] Rate limit check failed:', limitError.message);
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 503 });
    }

    const limitResult = Array.isArray(limitData) ? limitData[0] : limitData;
    if (!limitResult?.allowed) {
      return NextResponse.json(
        { success: false, error: 'تم تجاوز الحد المسموح' },
        { status: 429, headers: { 'Retry-After': String(limitResult?.retry_after ?? 0) } }
      );
    }

    // Check child's money balance
    const { data: moneyData } = await supabase
      .from('money_transactions')
      .select('amount, type')
      .eq('member_id', member.member_id)
      .eq('status', 'approved');

    const balance = (moneyData || []).reduce(
      (sum: number, t: any) => sum + (t.type === 'earned' ? t.amount : -t.amount),
      0
    );

    if (balance < amount) {
      return NextResponse.json({ success: false, error: 'الرصيد غير كافي' }, { status: 400 });
    }

    // Check for existing pending request
    const { data: existing } = await supabase
      .from('withdrawal_requests')
      .select('id')
      .eq('member_id', member.member_id)
      .eq('status', 'pending')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'يوجد طلب سحب معلق بالفعل' },
        { status: 400 }
      );
    }

    // Create withdrawal request
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .insert({
        member_id: member.member_id,
        amount: amount,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
    }

    // Notify parents about the withdrawal request
    notifyParents(member.family_id, {
      senderMemberId: member.member_id,
      type: 'withdrawal_request',
      title: 'طلب سحب أموال',
      body: `طلب ${member.member_name} سحب ${amount} د.ك`,
      referenceType: 'withdrawal',
      referenceId: data.id,
    });

    return NextResponse.json({ success: true, message: 'تم إرسال طلب السحب بنجاح' });
  } catch (err) {
    console.error('[GHRS WITHDRAWAL] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
