import { create } from 'zustand'

interface DevState {
  supabaseEnabled: boolean
  setSupabaseEnabled: (enabled: boolean) => void
  toggleSupabase: () => void
}

export const useDevStore = create<DevState>((set, get) => ({
  supabaseEnabled: false,
  setSupabaseEnabled: (enabled) => set({ supabaseEnabled: enabled }),
  toggleSupabase: () => set({ supabaseEnabled: !get().supabaseEnabled }),
}))


