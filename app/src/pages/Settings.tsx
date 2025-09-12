import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { useThemeStore } from '../stores/theme'
import { useCurrencyStore } from '../stores/currency'
import { useState } from 'react'
import { ConfirmDialog } from '../components/Modal'
import { supabase } from '../services/supabase/client'
import { useAuthStore } from '../stores/auth'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const { theme, toggle } = useThemeStore()
  const { baseCurrency, setBaseCurrency } = useCurrencyStore()
  const navigate = useNavigate()
  const signOut = useAuthStore((s) => s.signOut)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function onConfirmDelete() {
    try {
      setDeleting(true)
      setError(null)
      if (!supabase) throw new Error('Supabase not configured')
      const { error } = await supabase.functions.invoke('delete-account', { body: { confirm: true } })
      if (error) throw new Error(error.message)
      await signOut()
      navigate('/')
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete account')
    } finally {
      setDeleting(false)
      setConfirmOpen(false)
    }
  }
  // async function handleSync() {
  //   alert('Supabase sync will be implemented after schema approval.')
  // }
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Theme</div>
              <div className="text-subtler text-sm">Current: {theme}</div>
            </div>
            <button className="btn btn-outline" onClick={toggle}>Toggle</button>
          </div>
        </Card>
        <Card>
          <div>
            <div className="font-medium">Base currency</div>
            <div className="mt-2">
              <select className="select" value={baseCurrency} onChange={(e)=> setBaseCurrency(e.target.value as any)}>
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>
        </Card>
        <Card className="md:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-danger">Delete account and information</div>
              <div className="text-subtler text-sm mt-1">This permanently deletes your account and all associated data. This action cannot be undone.</div>
              {error ? <div className="text-danger text-sm mt-2">{error}</div> : null}
            </div>
            <button className="btn btn-danger" onClick={()=> setConfirmOpen(true)} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete account and data'}</button>
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => !deleting && setConfirmOpen(false)}
        onConfirm={onConfirmDelete}
        title="Delete account and all data?"
        body="This is permanent. All your transactions, budgets, assets, holdings, watchlist, incomes, and snapshots will be deleted."
      />
    </>
  )
}


