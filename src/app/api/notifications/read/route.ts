import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { validateRequestAuth } from '@/lib/auth/server-session';

export async function POST(request: NextRequest) {
  try {
    const session = await validateRequestAuth(request);
    if (!session.success || !session.member) {
      return NextResponse.json(
        { success: false, error: session.error },
        { status: session.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { notificationId } = body as { notificationId?: string };

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'معرف الإشعار مطلوب' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const memberId = session.member.member_id;

    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
      p_member_id: memberId,
    });

    if (error) {
      console.error('[GHRS NOTIFICATIONS] Mark read error:', error);
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: !!data });
  } catch (err) {
    console.error('[GHRS NOTIFICATIONS] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
