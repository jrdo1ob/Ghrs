import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export interface SessionMember {
  member_id: string
  member_name: string
  member_role: 'owner' | 'parent' | 'child'
  family_id: string
}

export interface SessionValidationResult {
  success: boolean
  member?: SessionMember
  error?: string
  status?: number
}

export async function validateSession(request: NextRequest): Promise<SessionValidationResult> {
  const sessionToken = request.cookies.get('ghrs_member_session')?.value
  if (!sessionToken) {
    return { success: false, error: 'يجب تسجيل الدخول أولاً', status: 401 }
  }

  const supabase = createServiceRoleClient()
  const { data: sessionData, error: sessionError } = await supabase.rpc('validate_member_session', {
    p_session_token: sessionToken,
  })

  if (sessionError || !sessionData || sessionData.length === 0) {
    return { success: false, error: 'جلسة غير صالحة أو منتهية', status: 401 }
  }

  const member = sessionData[0] as SessionMember
  return { success: true, member }
}

export function requireParentRole(member: SessionMember): { ok: boolean; error?: string; status?: number } {
  if (member.member_role !== 'parent' && member.member_role !== 'owner') {
    return { ok: false, error: 'هذه العملية مخصصة للوالدين فقط', status: 403 }
  }
  return { ok: true }
}

export async function verifyRecordBelongsToFamily(
  supabase: ReturnType<typeof createServiceRoleClient>,
  table: string,
  recordId: string,
  familyId: string,
  familyColumn: string = 'family_id'
): Promise<{ ok: boolean; error?: string; status?: number }> {
  const { data, error } = await supabase
    .from(table)
    .select(`${familyColumn}`)
    .eq('id', recordId)
    .single()

  if (error || !data) {
    return { ok: false, error: 'السجل غير موجود', status: 404 }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any
  if (row[familyColumn] !== familyId) {
    return { ok: false, error: 'السجل لا ينتمي لعائلتك', status: 403 }
  }

  return { ok: true }
}
