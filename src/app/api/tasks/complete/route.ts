import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // 1. Read session token from HttpOnly cookie
    const sessionToken = request.cookies.get('ghrs_member_session')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const { task_id } = await request.json()

    if (!task_id) {
      return NextResponse.json(
        { success: false, error: 'معرف المهمة مطلوب' },
        { status: 400 }
      )
    }

    // 3. Validate session using server-side RPC
    const supabase = await createClient()

    const { data: sessionData, error: sessionError } = await supabase.rpc('validate_member_session', {
      p_session_token: sessionToken,
    })

    if (sessionError || !sessionData || sessionData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'جلسة غير صالحة أو منتهية' },
        { status: 401 }
      )
    }

    const member = sessionData[0]

    // 4. Verify role === 'child'
    if (member.member_role !== 'child') {
      return NextResponse.json(
        { success: false, error: 'هذه العملية مخصصة للأطفال فقط' },
        { status: 403 }
      )
    }

    // 5. Get verified member_id from session (NOT from browser)
    const verifiedMemberId = member.member_id

    // 6. Call complete_task_with_rewards with verified member_id
    const { data, error } = await supabase.rpc('complete_task_with_rewards', {
      p_task_id: task_id,
      p_member_id: verifiedMemberId,
    })

    if (error) {
      console.error('[GHRS COMPLETE TASK] RPC error:', error.message)
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء إنجاز المهمة' },
        { status: 500 }
      )
    }

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: 'تم إنجاز المهمة بنجاح',
    })
  } catch (err) {
    console.error('[GHRS COMPLETE TASK] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    )
  }
}