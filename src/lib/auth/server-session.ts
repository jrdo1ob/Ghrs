import { type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
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
  /**
   * Which session type authorized the request:
   * - 'ghrs'    = HttpOnly ghrs_member_session cookie (Parent/Child code+PIN login)
   * - 'supabase' = Supabase Auth session (owner email/password or OAuth login)
   */
  via?: 'ghrs' | 'supabase'
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
  return { success: true, member, via: 'ghrs' }
}

/**
 * Validates a request against BOTH of GHRS's supported session types:
 *
 * 1. The internal GHRS member session (HttpOnly `ghrs_member_session` cookie)
 *    used by Parent/Child code+PIN logins — resolved via validateSession().
 * 2. A Supabase Auth session (owner email/password or OAuth login). The browser
 *    stores this session in cookies managed by @supabase/ssr, so a server-side
 *    getUser() works from any request. The supabase user is then mapped to a
 *    GHRS member via auth_identities (service-role, so it bypasses RLS).
 *
 * Between the two, every authenticated GHRS session type is supported. This is
 * the single entry point for ALL server read APIs created in Phase 3.
 */
export async function validateRequestAuth(request: NextRequest): Promise<SessionValidationResult> {
  // Method 1: Internal GHRS member session (Parent/Child code+PIN)
  const ghrsResult = await validateSession(request)
  if (ghrsResult.success && ghrsResult.member) {
    return ghrsResult
  }

  // Method 2: Supabase Auth session (owner email/password or OAuth)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // Read-only validation — never write cookies from read APIs
        setAll() {},
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'يجب تسجيل الدخول أولاً', status: 401 }
  }

  // Map the supabase auth user to a GHRS member using service-role (bypass RLS)
  const srv = createServiceRoleClient()

  const { data: identities, error: identityError } = await srv
    .from('auth_identities')
    .select('member_id')
    .eq('auth_user_id', user.id)
    .limit(1)

  if (identityError || !identities || identities.length === 0) {
    return { success: false, error: 'الحساب غير مرتبط بعضو في العائلة', status: 401 }
  }

  const { data: member, error: memberError } = await srv
    .from('members')
    .select('id, family_id, role, name')
    .eq('id', identities[0].member_id)
    .single()

  if (memberError || !member) {
    return { success: false, error: 'العضو غير موجود', status: 401 }
  }

  return {
    success: true,
    via: 'supabase',
    member: {
      member_id: member.id,
      member_name: member.name,
      member_role: member.role as SessionMember['member_role'],
      family_id: member.family_id,
    },
  }
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
