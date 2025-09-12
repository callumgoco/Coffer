import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '../stores/theme'

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore()
  return (
    <button aria-label="Toggle theme" onClick={toggle} className="btn btn-ghost btn-icon" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}

export default ThemeToggle
