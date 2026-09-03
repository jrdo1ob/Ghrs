import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client using service_role key.
 * This client bypasses RLS and has full database access.
 * 
 * IMPORTANT: This client must NEVER be imported in client-side code.
 * It should only be used in:
 * - API routes (src/app/api/*)
 * - Server Actions
 * - Middleware (if needed)
 * 
 * The service role key is stored in SUPABASE_SERVICE_ROLE_KEY environment variable.
 * This variable must NOT be prefixed with NEXT_PUBLIC_ to prevent browser exposure.
 */

export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}