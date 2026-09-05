import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

function generateFamilyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validate the Supabase Auth session server-side (Owner is signed in via Supabase Auth)
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'يجب تسجيل الدخول أولاً' }, { status: 401 })
    }

    // 2. Parse request body (family name + owner name only - nothing security-sensitive)
    const { family_name, owner_name } = await request.json()

    if (!family_name || !owner_name) {
      return NextResponse.json({ success: false, error: 'البيانات غير مكتملة' }, { status: 400 })
    }

    const admin = createServiceRoleClient()

    // 3. Check the owner has not already set up a family
    const { data: existingIdentity, error: existingError } = await admin
      .from('auth_identities')
      .select('member_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 })
    }

    let identity = existingIdentity

    if (!identity) {
      // 4. Create family (code generated server-side)
      const familyCode = generateFamilyCode()
      const { data: family, error: familyError } = await admin
        .from('families')
        .insert({ name: family_name, code: familyCode, created_by: user.id })
        .select()
        .single()

      if (familyError || !family) {
        console.error('[GHRS FAMILY SETUP] Family error:', familyError?.message)
        return NextResponse.json({ success: false, error: 'تعذر إنشاء العائلة' }, { status: 500 })
      }

      // 5. Create owner member
      const { data: member, error: memberError } = await admin
        .from('members')
        .insert({ family_id: family.id, name: owner_name, role: 'owner' })
        .select()
        .single()

      if (memberError || !member) {
        console.error('[GHRS FAMILY SETUP] Member error:', memberError?.message)
        return NextResponse.json({ success: false, error: 'تعذر إنشاء العضو' }, { status: 500 })
      }

      // 6. Link auth identity to the member
      const { error: linkError } = await admin
        .from('auth_identities')
        .insert({ member_id: member.id, auth_user_id: user.id, provider: 'email' })

      if (linkError) {
        console.error('[GHRS FAMILY SETUP] Link error:', linkError.message)
        return NextResponse.json({ success: false, error: 'تعذر ربط الحساب' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'تم إنشاء العائلة بنجاح' })
    }

    return NextResponse.json({ success: true, message: 'العائلة موجودة بالفعل' })
  } catch (err) {
    console.error('[GHRS FAMILY SETUP] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
