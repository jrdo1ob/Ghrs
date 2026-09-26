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

    const supabase = createServiceRoleClient();
    const memberId = session.member.member_id;

    const { data, error } = await supabase.rpc('get_unread_notification_count', {
      p_member_id: memberId,
    });

    if (error) {
      console.error('[GHRS NOTIFICATIONS] Unread count error:', error);
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data || 0 });
  } catch (err) {
    console.error('[GHRS NOTIFICATIONS] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
