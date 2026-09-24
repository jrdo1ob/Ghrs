import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { validateRequestAuth, requireParentRole } from '@/lib/auth/server-session';

export async function POST(request: NextRequest) {
  try {
    const session = await validateRequestAuth(request);
    if (!session.success || !session.member) {
      return NextResponse.json(
        { success: false, error: session.error },
        { status: session.status }
      );
    }

    const roleCheck = requireParentRole(session.member);
    if (!roleCheck.ok) {
      return NextResponse.json(
        { success: false, error: roleCheck.error },
        { status: roleCheck.status }
      );
    }

    const { child_id, target_tasks } = await request.json();

    if (!child_id || target_tasks === undefined) {
      return NextResponse.json({ success: false, error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    if (typeof target_tasks !== 'number' || target_tasks < 1 || target_tasks > 20) {
      return NextResponse.json(
        { success: false, error: 'الهدف يجب أن يكون بين 1 و 20' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Verify child belongs to same family
    const { data: child } = await supabase
      .from('members')
      .select('family_id, role')
      .eq('id', child_id)
      .single();

    if (!child || child.role !== 'child') {
      return NextResponse.json({ success: false, error: 'الطفل غير موجود' }, { status: 404 });
    }

    if (child.family_id !== session.member.family_id) {
      return NextResponse.json(
        { success: false, error: 'الطفل لا ينتمي لعائلتك' },
        { status: 403 }
      );
    }

    // Set the daily goal via RPC
    const { data, error } = await supabase.rpc('set_daily_goal', {
      p_member_id: child_id,
      p_target_tasks: target_tasks,
      p_caller_member_id: session.member.member_id,
    });

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result || !result.success) {
      return NextResponse.json(
        { success: false, error: result?.message || 'حدث خطأ' },
        { status: 500 }
      );
    }

    console.log('[GHRS DAILY GOAL] SUCCESS:', result.message);
    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    console.error('[GHRS DAILY GOAL] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
