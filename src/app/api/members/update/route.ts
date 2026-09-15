import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateSession, requireParentRole } from '@/lib/auth/server-session'

// Reject weak PINs: repeated digits (0000-9999), sequential ascending/descending
function isWeakPin(pin: string): boolean {
  // Repeated digits: 0000, 1111, 2222, ..., 9999
  if (/^(\d)\1+$/.test(pin)) return true
  // Sequential ascending: 1234, 2345, 3456, 4567, 5678, 6789
  for (let i = 1; i <= 6; i++) {
    const seq = Array.from({ length: pin.length }, (_, j) => String((i + j) % 10)).join('')
    if (pin === seq) return true
  }
  // Sequential descending: 4321, 5432, 6543, 7654, 8765, 9876
  for (let i = 9; i >= 4; i--) {
    const seq = Array.from({ length: pin.length }, (_, j) => String((i - j + 10) % 10)).join('')
    if (pin === seq) return true
  }
  return false
}

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const member = session.member

    const roleCheck = requireParentRole(member)
    if (!roleCheck.ok) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: roleCheck.status })
    }

    const { member_id, name, pin } = await request.json()
    if (!member_id) {
      return NextResponse.json({ success: false, error: 'معرف العضو مطلوب' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify target member belongs to the session family
    const { data: target } = await supabase
      .from('members')
      .select('family_id, role')
      .eq('id', member_id)
      .single()

    if (!target) {
      return NextResponse.json({ success: false, error: 'العضو غير موجود' }, { status: 404 })
    }

    if (target.family_id !== member.family_id) {
      return NextResponse.json({ success: false, error: 'العضو لا ينتمي لعائلتك' }, { status: 403 })
    }

    // Prevent changing family through update
    // Build update payload; NEVER include family_id
    const updates: Record<string, unknown> = {}
    if (name !== undefined && name !== null) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ success: false, error: 'الاسم مطلوب' }, { status: 400 })
      }
      updates.name = name.trim()
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('members')
        .update(updates)
        .eq('id', member_id)

      if (updateError) {
        console.error('[GHRS UPDATE MEMBER] Update error:', updateError.message)
        return NextResponse.json({ success: false, error: 'تعذر تحديث العضو' }, { status: 500 })
      }
    }

    // Set PIN if provided
    if (pin && typeof pin === 'string' && pin.length >= 4) {
      if (!/^\d{4,6}$/.test(pin)) {
        return NextResponse.json({ success: false, error: 'الرمز يجب أن يكون 4-6 أرقام' }, { status: 400 })
      }
      if (isWeakPin(pin)) {
        return NextResponse.json({ success: false, error: 'الرمز ضعيف جداً، يرجى اختيار رمز أقوى' }, { status: 400 })
      }
      const { error: pinError } = await supabase.rpc('set_member_pin', {
        p_member_id: member_id,
        p_pin: pin,
      })
      if (pinError) {
        console.error('[GHRS UPDATE MEMBER] PIN error:', pinError.message)
        return NextResponse.json({ success: false, error: 'تعذر تحديث الرمز' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'تم تحديث العضو بنجاح' })
  } catch (err) {
    console.error('[GHRS UPDATE MEMBER] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
