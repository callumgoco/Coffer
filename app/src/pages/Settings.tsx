import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { useThemeStore } from '../stores/theme'
import { useCurrencyStore } from '../stores/currency'

export default function SettingsPage() {
  const { theme, toggle } = useThemeStore()
  const { baseCurrency, setBaseCurrency } = useCurrencyStore()
  async function handleSync() {
    alert('Supabase sync will be implemented after schema approval.')
  }
  return (
    <>
      <PageHeader title="Settings" />
      <Card className="mt-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Theme</div>
            <div className="text-subtler text-sm">Current: {theme}</div>
          </div>
          <button className="btn btn-outline" onClick={toggle}>Toggle</button>
        </div>
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
        
      </div>
    </Card>
    </>
  )
}


