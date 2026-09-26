import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { validateRequestAuth } from '@/lib/auth/server-session';

const PAGE_SIZE = 20;

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
    const { page = 1, unreadOnly = false } = body as {
      page?: number;
      unreadOnly?: boolean;
    };

    const supabase = createServiceRoleClient();
    const memberId = session.member.member_id;
    const familyId = session.member.family_id;

    let query = supabase
      .from('notifications')
      .select('id, type, title, body, reference_type, reference_id, is_read, created_at, sender_member_id', { count: 'exact' })
      .eq('family_id', familyId)
      .eq('recipient_member_id', memberId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const offset = (Math.max(1, page) - 1) * PAGE_SIZE;
    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[GHRS NOTIFICATIONS] Query error:', error);
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
    }

    // Resolve sender names
    const senderIds = [...new Set((data || []).map((n) => n.sender_member_id).filter(Boolean))];
    let senderMap: Record<string, string> = {};
    if (senderIds.length > 0) {
      const { data: senders } = await supabase
        .from('members')
        .select('id, name')
        .in('id', senderIds);
      if (senders) {
        senderMap = Object.fromEntries(senders.map((s) => [s.id, s.name]));
      }
    }

    const notifications = (data || []).map((n) => ({
      ...n,
      sender_name: n.sender_member_id ? senderMap[n.sender_member_id] || null : null,
    }));

    return NextResponse.json({
      success: true,
      notifications,
      total: count || 0,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    console.error('[GHRS NOTIFICATIONS] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
