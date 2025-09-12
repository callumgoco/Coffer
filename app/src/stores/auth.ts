import { create } from 'zustand'
import { supabase } from '../services/supabase/client'

export interface UserProfile {
  id: string
  email: string | null
  full_name?: string | null
  base_currency?: 'GBP' | 'USD' | 'EUR' | 'CAD' | null
}

interface AuthState {
  loading: boolean
  session: import('@supabase/supabase-js').Session | null
  profile: UserProfile | null
  initialized: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  upsertProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) return null
  if (!data) return null
  return {
    id: data.id,
    email: data.email ?? null,
    full_name: (data as any).full_name ?? null,
    base_currency: (data as any).base_currency ?? null,
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  loading: true,
  session: null,
  profile: null,
  initialized: false,

  async refreshProfile() {
    const session = get().session
    if (!session?.user) return
    const profile = await fetchProfile(session.user.id)
    set({ profile })
  },

  async upsertProfile(updates) {
    const session = get().session
    if (!session?.user) return { error: new Error('Not signed in') }
    const payload = { id: session.user.id, email: session.user.email, ...updates }
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
    if (!error) await get().refreshProfile()
    return { error: error ? new Error(error.message) : null }
  },

  async signInWithEmail(email, password) {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) {
      set({ session: data.session })
      await get().refreshProfile()
    }
    return { error: error ? new Error(error.message) : null }
  },

  async signUpWithEmail(email, password) {
    const { error, data } = await supabase.auth.signUp({ email, password })
    if (!error) {
      set({ session: data.session ?? null })
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, email: data.user.email })
        await get().refreshProfile()
      }
    }
    return { error: error ? new Error(error.message) : null }
  },

  async signOut() {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },
}))

// Initialize auth state and subscribe to changes
;(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  useAuthStore.setState({ session: session ?? null })
  if (session?.user) {
    const profile = await fetchProfile(session.user.id)
    useAuthStore.setState({ profile })
  }
  useAuthStore.setState({ loading: false, initialized: true })

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    useAuthStore.setState({ session: newSession ?? null })
    if (newSession?.user) {
      const profile = await fetchProfile(newSession.user.id)
      useAuthStore.setState({ profile })
    } else {
      useAuthStore.setState({ profile: null })
    }
  })
})()


