import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth, requireParentRole } from '@/lib/auth/server-session'

const ALLOWED_CURRENCIES = ['KWD', 'SAR', 'AED', 'QAR', 'BHD', 'OMR']

export async function POST(request: NextRequest) {
  try {
    const session = await validateRequestAuth(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const roleCheck = requireParentRole(session.member)
    if (!roleCheck.ok) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: roleCheck.status })
    }

    const { name, currency } = await request.json()

    // Build a whitelisted update payload — NEVER trust a client-supplied family_id
    const updates: Record<string, string> = {}
    if (name !== undefined && name !== null) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ success: false, error: 'الاسم لا يمكن أن يكون فارغاً' }, { status: 400 })
      }
      updates.name = name.trim()
    }
    if (currency !== undefined && currency !== null) {
      if (typeof currency !== 'string' || !ALLOWED_CURRENCIES.includes(currency)) {
        return NextResponse.json({ success: false, error: 'العملة غير مدعومة' }, { status: 400 })
      }
      updates.currency = currency
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'لا توجد بيانات للتحديث' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Update the SESSION family only (family_id is derived from the session)
    const { data: family, error } = await supabase
      .from('families')
      .update(updates)
      .eq('id', session.member.family_id)
      .select('id, name, code, currency')
      .single()

    if (error) {
      console.error('[GHRS SETTINGS UPDATE FAMILY] Update error:', error.message)
      return NextResponse.json({ success: false, error: 'حدث خطأ أثناء تحديث العائلة' }, { status: 500 })
    }

    return NextResponse.json({ success: true, family })
  } catch (err) {
    console.error('[GHRS SETTINGS UPDATE FAMILY] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}