import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import CurrencySelect from '../components/CurrencySelect'
import { Search, Sun, Moon, PieChart, Settings, Home, Wallet, BarChart3, Table, CircleDollarSign, ChevronDown } from 'lucide-react'
import { useThemeStore } from '../stores/theme'
import { useEffect } from 'react'
import { useCurrencyStore } from '../stores/currency'
import DateRangePicker, { type DateRange } from '../components/DateRangePicker'
import { useState } from 'react'
import { useAuthStore } from '../stores/auth'
import logoLight from '../../assets/logo-2-light-mode.png'
import logoDark from '../../assets/logo-2-dark-mode.png'

const navItems = [
  { to: '/app', label: 'Overview', icon: Home },
  { to: '/app/transactions', label: 'Transactions', icon: Table },
  { to: '/app/budgets', label: 'Budgets', icon: Wallet },
  { to: '/app/investments', label: 'Investments', icon: BarChart3 },
  { to: '/app/assets', label: 'Assets', icon: CircleDollarSign },
  { to: '/app/reports', label: 'Reports', icon: PieChart },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const { theme, toggle } = useThemeStore()
  const [range, setRange] = useState<DateRange | undefined>(undefined)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const signOut = useAuthStore(s => s.signOut)
  const profile = useAuthStore(s => s.profile)
  const baseCurrency = useCurrencyStore(s => s.baseCurrency)
  const setBaseCurrency = useCurrencyStore(s => s.setBaseCurrency)
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    setUserMenuOpen(false)
    navigate('/login')
  }

  // Sync base currency from profile → local store so server snapshots align
  useEffect(() => {
    const p = profile?.base_currency as any
    if (p && p !== baseCurrency) setBaseCurrency(p)
  }, [profile, baseCurrency, setBaseCurrency])

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-56 flex-col bg-sidebar m-3 rounded-xl shadow-lg overflow-hidden">
          <div className="h-16 flex items-center justify-center px-4 pt-4">
            <Link to="/app" className="flex items-center">
              <img src={theme === 'dark' ? logoDark : logoLight} alt="Coffer" className="h-12 md:h-16 object-contain" />
            </Link>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors relative ${isActive ? 'bg-muted font-medium' : ''}`
                }
                end={to === '/app'}
              >
                {/* Active indicator bar */}
                {({ isActive }) => (
                  <>
                    <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-accent transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
                    <Icon size={18} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="p-3 text-xs text-subtler">v0.1.0</div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-16 shrink-0 bg-header flex items-center justify-between gap-3 px-4 md:px-6 sticky top-3 z-40 mx-3 md:mx-4 rounded-xl shadow-lg">
            <div className="flex items-center gap-2 flex-1 max-w-2xl">
              <button className="btn btn-ghost btn-sm md:hidden" aria-label="Open navigation" onClick={() => setMobileNavOpen(v => !v)}>Menu</button>
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-subtler" size={16} />
                <input aria-label="Search" placeholder="Search..." className="input pl-9 pr-3" />
              </div>
              <div className="hidden md:flex items-center gap-2">
                <DateRangePicker value={range} onChange={setRange} />
              </div>
            </div>
            <div className="flex items-center gap-2 relative">
              <CurrencySelect size="xs" />
              <button aria-label="Toggle theme" onClick={toggle} className="btn btn-ghost btn-icon" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button className="btn btn-ghost px-2" aria-haspopup="menu" aria-expanded={userMenuOpen} onClick={() => setUserMenuOpen(v => !v)}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-accent text-white text-xs font-semibold">CO</span>
                  <ChevronDown size={16} className="text-subtler" />
                </div>
              </button>
              {userMenuOpen ? (
                <div className="absolute right-0 top-full mt-2 z-50">
                  <div className="card p-2 w-40">
                    <button className="btn btn-ghost w-full justify-start" onClick={handleSignOut}>Sign out</button>
                  </div>
                </div>
              ) : null}
            </div>
          </header>

          {/* Mobile nav */}
          {mobileNavOpen ? (
            <div className="md:hidden relative z-40">
              <div className="absolute left-3 right-3 top-2">
                <div className="card p-2">
                  <nav className="space-y-1">
                    {navItems.map(({ to, label, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                          `group flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors relative ${isActive ? 'bg-muted font-medium' : ''}`
                        }
                        end={to === '/app'}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        <Icon size={18} />
                        <span>{label}</span>
                      </NavLink>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          ) : null}

          <div className="p-4 md:p-6 pt-8 md:pt-10 flex-1 min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
