'use client'

export interface AuthUser {
  memberId: string
  familyId: string
  role: 'owner' | 'parent' | 'child'
  name: string
  loginCode?: string
  via: 'supabase' | 'session'
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  // Server-side session validation covering BOTH session types:
  //  1. GHRS internal member session (HttpOnly cookie — code+PIN login)
  //  2. Supabase Auth session (owner email/password or OAuth — cookie-synced)
  // After Phase 3 (migration 038) the browser can no longer SELECT from
  // family-private tables (members, ...), so the member identity must always
  // be resolved server-side via /api/auth/validate-session.
  try {
    const response = await fetch('/api/auth/validate-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.member) {
        return {
          memberId: data.member.member_id,
          familyId: data.member.family_id,
          role: data.member.role as 'owner' | 'parent' | 'child',
          name: data.member.name,
          via: data.via === 'supabase' ? 'supabase' : 'session',
        }
      }
    }
  } catch (err) {
    console.error('[GHRS] Session validation error:', err)
  }

  return null
}

export async function requireAuth(allowedRoles?: ('owner' | 'parent' | 'child')[]): Promise<AuthUser> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('NOT_AUTHENTICATED')
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error('NOT_AUTHORIZED')
  }

  return user
}

export async function clearAuth() {
  // Call logout API to delete session from database
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch (err) {
    console.error('[GHRS] Logout API error:', err)
  }
  
  // Clear cookie
  document.cookie = 'ghrs_member_session=; path=/; max-age=0'
  
  // Clear localStorage (UI-only data)
  localStorage.removeItem('parent_id')
  localStorage.removeItem('child_id')
  localStorage.removeItem('family_id')
  localStorage.removeItem('ghrs_session_role')
  localStorage.removeItem('family_code')
  localStorage.removeItem('member_name')
}