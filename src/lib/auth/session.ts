'use client'

const COOKIE_NAME = 'ghrs_member_session'

export function getSessionToken(): string | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  const sessionCookie = cookies.find(c => c.trim().startsWith(`${COOKIE_NAME}=`))
  
  if (!sessionCookie) return null
  
  return sessionCookie.split('=')[1]?.trim() || null
}

export function isAuthenticated(): boolean {
  return getSessionToken() !== null
}

export async function clearMemberSession() {
  if (typeof document === 'undefined') return
  
  try {
    // Call logout API to delete session from database
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch (err) {
    console.error('[GHRS] Logout API error:', err)
  }
  
  // Clear cookie (even if API fails)
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
  
  // Clear localStorage (UI-only data)
  localStorage.removeItem('ghrs_session_role')
  localStorage.removeItem('family_code')
  localStorage.removeItem('member_name')
  localStorage.removeItem('parent_id')
  localStorage.removeItem('child_id')
  localStorage.removeItem('family_id')
}
