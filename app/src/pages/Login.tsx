import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail)
  const loadingGlobal = useAuthStore((s) => s.loading)
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signInWithEmail(email, password)
    setSubmitting(false)
    if (error) {
      setError(error.message)
    } else {
      if (!profile?.base_currency) navigate('/onboarding')
      else navigate('/app')
    }
  }

  if (loadingGlobal) {
    return <div className="p-6">Loading...</div>
  }
  if (session && profile?.base_currency) navigate('/app')

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="card p-6 w-full max-w-md">
        <h1 className="text-xl font-semibold mb-4">Welcome back</h1>
        <label className="label">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mb-3" required />
        <label className="label">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mb-4" required />
        {error ? <div className="text-red-500 text-sm mb-3">{error}</div> : null}
        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</button>
        <div className="text-sm text-subtle mt-4">
          No account? <Link to="/signup" className="link">Create one</Link>
        </div>
      </form>
    </div>
  )
}


