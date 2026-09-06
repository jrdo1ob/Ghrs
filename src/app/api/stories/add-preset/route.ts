import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth, requireParentRole, verifyRecordBelongsToFamily } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  try {
    const session = await validateRequestAuth(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const member = session.member

    const roleCheck = requireParentRole(member)
    if (!roleCheck.ok) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: roleCheck.status })
    }

    const { preset_id, assigned_to } = await request.json()
    if (!preset_id) {
      return NextResponse.json({ success: false, error: 'معرّف القصة مطلوب' }, { status: 400 })
    }

    // family_id and created_by MUST come from the validated session, never from the browser
    const supabase = createServiceRoleClient()

    // Verify the assigned child/member belongs to this family before assigning
    if (assigned_to) {
      const ownership = await verifyRecordBelongsToFamily(supabase, 'members', assigned_to, member.family_id)
      if (!ownership.ok) {
        return NextResponse.json({ success: false, error: ownership.error }, { status: ownership.status })
      }
    }

    // Load the global preset; it is shared reference data, safe to read.
    const { data: preset, error: presetError } = await supabase
      .from('preset_stories')
      .select('id, title, content, moral_value')
      .eq('id', preset_id)
      .single()

    if (presetError || !preset) {
      return NextResponse.json({ success: false, error: 'القصة غير موجودة في المكتبة' }, { status: 404 })
    }

    // Insert the preset story for the session family (5 XP default, matching RPC behavior)
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert({
        family_id: member.family_id,
        title: preset.title,
        content: preset.content,
        moral_value: preset.moral_value,
        reward_xp: 5,
        assigned_to: assigned_to || null,
        is_preset: true,
        is_active: true,
        created_by: member.member_id,
      })
      .select()
      .single()

    if (storyError || !story) {
      console.error('[GHRS ADD PRESET STORY] Insert story error:', storyError?.message)
      return NextResponse.json(
        { success: false, error: 'تعذر إضافة القصة، حاول مرة أخرى' },
        { status: 500 }
      )
    }

    // Create a reading task for the child, mirroring the original RPC behavior
    const { error: taskError } = await supabase
      .from('tasks')
      .insert({
        family_id: member.family_id,
        title: 'اقرأ: ' + preset.title,
        description: 'قصة تربوية - ' + preset.moral_value,
        xp_reward: 5,
        assigned_to: assigned_to ? [assigned_to] : null,
        requires_approval: true,
        is_active: true,
        created_by: member.member_id,
        story_content: preset.content,
      })

    if (taskError) {
      console.error('[GHRS ADD PRESET STORY] Insert task error:', taskError.message)
      return NextResponse.json(
        { success: false, error: 'تعذر إضافة القصة، حاول مرة أخرى' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'تمت إضافة القصة بنجاح', story_id: story.id })
  } catch (err) {
    console.error('[GHRS ADD PRESET STORY] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}