'use client'

import { createClient } from '@/lib/supabase/client'

export interface AuthUser {
  memberId: string
  familyId: string
  role: 'owner' | 'parent' | 'child'
  name: string
  loginCode?: string
  via: 'supabase' | 'session'
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient()

  // Method 1: Check Supabase auth (owner login)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: identity } = await supabase
      .from('auth_identities')
      .select('member_id')
      .eq('auth_user_id', user.id)
      .single()

    if (identity) {
      const { data: member } = await supabase
        .from('members')
        .select('id, family_id, role, name, login_code')
        .eq('id', identity.member_id)
        .single()

      if (member) {
        return {
          memberId: member.id,
          familyId: member.family_id,
          role: member.role as 'owner' | 'parent' | 'child',
          name: member.name,
          loginCode: member.login_code,
          via: 'supabase'
        }
      }
    }
    return null
  }

  // Method 2: Check session cookie for parent/child login
  // The cookie contains session_token (NOT member_id)
  // We validate it server-side via API call
  const sessionToken = getSessionTokenFromCookie()
  if (sessionToken) {
    try {
      const response = await fetch('/api/auth/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.member) {
          return {
            memberId: data.member.member_id,
            familyId: data.member.family_id,
            role: data.member.role as 'owner' | 'parent' | 'child',
            name: data.member.name,
            loginCode: data.member.login_code,
            via: 'session'
          }
        }
      }
    } catch (err) {
      console.error('[GHRS] Session validation error:', err)
    }
  }

  return null
}

// Helper to get session token from cookie
function getSessionTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  const sessionCookie = cookies.find(c => c.trim().startsWith('ghrs_member_session='))
  if (!sessionCookie) return null
  return sessionCookie.split('=')[1]?.trim() || null
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
