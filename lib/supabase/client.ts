import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || key.startsWith('sb_')) {
    console.warn('⚠️ Supabase keys are missing or appear invalid in .env.local')
  }

  return createBrowserClient(url!, key!)
}
