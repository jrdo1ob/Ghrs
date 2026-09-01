'use client'

import { createClient } from '@/lib/supabase/client'

export interface AuthUser {
  memberId: string
  familyId: string
  role: 'owner' | 'parent' | 'child'
  name: string
  loginCode?: string
  via: 'supabase' | 'localStorage'
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

  // Method 2: Check localStorage for parent login
  const parentId = localStorage.getItem('parent_id')
  if (parentId) {
    const { data: member } = await supabase
      .from('members')
      .select('id, family_id, role, name, login_code')
      .eq('id', parentId)
      .single()

    if (member && (member.role === 'parent' || member.role === 'owner')) {
      return {
        memberId: member.id,
        familyId: member.family_id,
        role: member.role as 'owner' | 'parent',
        name: member.name,
        loginCode: member.login_code,
        via: 'localStorage'
      }
    }
  }

  // Method 3: Check localStorage for child login
  const childId = localStorage.getItem('child_id')
  if (childId) {
    const { data: member } = await supabase
      .from('members')
      .select('id, family_id, role, name, login_code')
      .eq('id', childId)
      .single()

    if (member && member.role === 'child') {
      return {
        memberId: member.id,
        familyId: member.family_id,
        role: 'child',
        name: member.name,
        loginCode: member.login_code,
        via: 'localStorage'
      }
    }
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

export function clearAuth() {
  localStorage.removeItem('parent_id')
  localStorage.removeItem('child_id')
  localStorage.removeItem('family_id')
  localStorage.removeItem('ghrs_session_role')
  // Clear session cookie
  document.cookie = 'ghrs_member_session=; path=/; max-age=0'
}
