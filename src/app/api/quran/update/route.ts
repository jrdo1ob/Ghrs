import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth } from '@/lib/auth/server-session'

function isValidSurah(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 114
}

function isValidAyah(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
}

export async function POST(request: NextRequest) {
  try {
    const session = await validateRequestAuth(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const { surah, ayah } = await request.json()

    if (!isValidSurah(surah) || !isValidAyah(ayah)) {
      return NextResponse.json({ success: false, error: 'بيانات التقدم غير صحيحة' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // The progress is recorded for the authenticated member ONLY — the
    // member_id is derived from the validated session, never from the client.
    const completedAt = new Date().toISOString()
    const { data: record, error } = await supabase
      .from('quran_progress')
      .insert({
        member_id: session.member.member_id,
        surah,
        ayah,
        completed_at: completedAt,
      })
      .select('id, member_id, surah, ayah, completed_at')
      .single()

    if (error) {
      console.error('[GHRS QURAN UPDATE] Insert error:', error.message)
      return NextResponse.json({ success: false, error: 'حدث خطأ أثناء إضافة التقدم' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      record: {
        surah: record.surah,
        ayah: record.ayah,
        completed_at: record.completed_at,
      },
    })
  } catch (err) {
    console.error('[GHRS QURAN UPDATE] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}