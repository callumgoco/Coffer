import { create } from 'zustand'
import { useAuthStore } from './auth'

export type CurrencyCode = 'GBP' | 'USD' | 'EUR' | 'CAD'

interface CurrencyState {
  baseCurrency: CurrencyCode
  setBaseCurrency: (code: CurrencyCode) => void
}

const STORAGE_KEY = 'coffer_base_currency'

function getInitialBaseCurrency(): CurrencyCode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'GBP' || stored === 'USD' || stored === 'EUR' || stored === 'CAD') return stored
  return 'GBP'
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  baseCurrency: getInitialBaseCurrency(),
  setBaseCurrency: (code) => set(() => {
    localStorage.setItem(STORAGE_KEY, code)
    // Also persist to profile if signed in
    const session = useAuthStore.getState().session
    if (session?.user) {
      useAuthStore.getState().upsertProfile({ base_currency: code as any })
    }
    return { baseCurrency: code }
  }),
}))


