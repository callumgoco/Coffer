import { supabaseService } from './supabase'
import { mockService } from './mock'

type SupabaseService = typeof supabaseService
type MockService = typeof mockService
export type Service = SupabaseService | MockService

const dataMode = (import.meta as any).env?.VITE_DATA_MODE ?? 'mock'

export const service: Service = dataMode === 'live' && (import.meta as any).env?.VITE_SUPABASE_URL && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY
  ? supabaseService
  : mockService


