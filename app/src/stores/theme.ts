import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggle: () => void
  set: (theme: Theme) => void
}

const STORAGE_KEY = 'coffer_theme'

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  toggle: () =>
    set((prev) => {
      const next: Theme = prev.theme === 'light' ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', next === 'dark')
      localStorage.setItem(STORAGE_KEY, next)
      return { theme: next }
    }),
  set: (theme) =>
    set(() => {
      document.documentElement.classList.toggle('dark', theme === 'dark')
      localStorage.setItem(STORAGE_KEY, theme)
      return { theme }
    }),
}))

// Apply on load
document.documentElement.classList.toggle('dark', getInitialTheme() === 'dark')


