/**
 * Extracts the client IP address from a request.
 *
 * Checks x-forwarded-for (first entry), then x-real-ip, then falls back
 * to 'unknown'. Used by rate-limited API routes to identify callers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}
