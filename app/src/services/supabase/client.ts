import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// In environments without Supabase configuration, export a null client.
// Call sites already guard for a falsy client.
export const supabase: SupabaseClient | null = (url && key) ? createClient(url, key) : null


