// Supabase client for server-side usage (Server Actions, API Routes, etc.)

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // For server actions, we use the service role key for full access
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

// Export a synchronous version for convenience
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}