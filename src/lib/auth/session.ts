'use client'

const COOKIE_NAME = 'ghrs_member_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function setMemberSession(memberId: string, role: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=${memberId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`
  localStorage.setItem('ghrs_session_role', role)
}

export function getMemberSession(): { memberId: string; role: string } | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  const sessionCookie = cookies.find(c => c.trim().startsWith(`${COOKIE_NAME}=`))
  
  if (!sessionCookie) return null
  
  const memberId = sessionCookie.split('=')[1]?.trim()
  const role = localStorage.getItem('ghrs_session_role')
  
  if (!memberId || !role) return null
  
  return { memberId, role }
}

export function clearMemberSession() {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
  localStorage.removeItem('ghrs_session_role')
  localStorage.removeItem('parent_id')
  localStorage.removeItem('child_id')
  localStorage.removeItem('family_id')
}
