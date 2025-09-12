import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

const currencies = [
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const upsertProfile = useAuthStore((s) => s.upsertProfile)
  const [fullName, setFullName] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session) navigate('/login')
    if (profile?.base_currency) navigate('/app')
  }, [session, profile, navigate])

  async function onContinue() {
    setSaving(true)
    await upsertProfile({ full_name: fullName, base_currency: currency as any })
    setSaving(false)
    navigate('/app')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-6 w-full max-w-md">
        <h1 className="text-xl font-semibold mb-1">Welcome to Coffer</h1>
        <p className="text-subtle text-sm mb-4">Just a couple of details to personalize your experience.</p>
        <label className="label">Your name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input mb-3" placeholder="Jane Smith" />
        <label className="label">Base currency</label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input mb-5">
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <button onClick={onContinue} className="btn btn-primary w-full" disabled={saving}>{saving ? 'Saving...' : 'Continue to dashboard'}</button>
      </div>
    </div>
  )
}


