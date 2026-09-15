import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

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
    // 1. Read session token from HttpOnly cookie
    const sessionToken = request.cookies.get('ghrs_member_session')?.value
    if (!sessionToken) {
      return NextResponse.json({ success: false, error: 'يجب تسجيل الدخول أولاً' }, { status: 401 })
    }

    // 2. Parse request body
    const { name, role, pin } = await request.json()
    if (!name || !role) {
      return NextResponse.json({ success: false, error: 'الاسم والدور مطلوبان' }, { status: 400 })
    }

    // 2b. Validate PIN format and reject weak PINs
    if (pin !== undefined && pin !== null && pin !== '') {
      if (typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) {
        return NextResponse.json({ success: false, error: 'الرمز يجب أن يكون 4-6 أرقام' }, { status: 400 })
      }
      if (isWeakPin(pin)) {
        return NextResponse.json({ success: false, error: 'الرمز ضعيف جداً، يرجى اختيار رمز أقوى' }, { status: 400 })
      }
    }

    // 3. Validate session using server-side RPC
    const supabase = createServiceRoleClient()
    const { data: sessionData, error: sessionError } = await supabase.rpc('validate_member_session', {
      p_session_token: sessionToken,
    })

    if (sessionError || !sessionData || sessionData.length === 0) {
      return NextResponse.json({ success: false, error: 'جلسة غير صالحة أو منتهية' }, { status: 401 })
    }

    const member = sessionData[0]

    // 4. Verify role === 'parent' or 'owner'
    if (member.member_role !== 'parent' && member.member_role !== 'owner') {
      return NextResponse.json({ success: false, error: 'هذه العملية مخصصة للوالدين فقط' }, { status: 403 })
    }

    // 5. Get the family code from the session's family_id
    const { data: familyData } = await supabase
      .from('families')
      .select('code')
      .eq('id', member.family_id)
      .single()

    if (!familyData || !familyData.code) {
      return NextResponse.json({ success: false, error: 'تعذر العثور على كود العائلة' }, { status: 500 })
    }

    // 6. Generate login code using the trusted family code (from session, not browser)
    const { data: loginCode, error: loginCodeError } = await supabase.rpc('generate_unique_login_code', {
      p_family_code: familyData.code,
      p_role: role,
    })

    if (loginCodeError || !loginCode) {
      return NextResponse.json({ success: false, error: 'تعذر إنشاء كود الدخول' }, { status: 500 })
    }

    // 7. Create member with trusted family_id from session
    const { data: newMember, error: insertError } = await supabase
      .from('members')
      .insert({
        family_id: member.family_id,
        name: name,
        role: role,
        login_code: loginCode,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[GHRS CREATE MEMBER] Insert error:', insertError.message)
      return NextResponse.json({ success: false, error: 'تعذر إنشاء العضو' }, { status: 500 })
    }

    // 8. Set PIN if provided
    if (pin) {
      const { error: pinError } = await supabase.rpc('set_member_pin', {
        p_member_id: newMember.id,
        p_pin: pin,
      })
      if (pinError) {
        console.error('[GHRS CREATE MEMBER] PIN error:', pinError.message)
      }
    }

    // 9. Return success
    return NextResponse.json({
      success: true,
      message: 'تم إنشاء العضو بنجاح',
      member: newMember,
    })
  } catch (err) {
    console.error('[GHRS CREATE MEMBER] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}