import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

export default function SignupPage() {
  const navigate = useNavigate()
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signUpWithEmail(email, password)
    setSubmitting(false)
    if (error) setError(error.message)
    else navigate('/onboarding')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="card p-6 w-full max-w-md">
        <h1 className="text-xl font-semibold mb-4">Create your account</h1>
        <label className="label">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mb-3" required />
        <label className="label">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mb-4" required />
        {error ? <div className="text-red-500 text-sm mb-3">{error}</div> : null}
        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>{submitting ? 'Creating...' : 'Create account'}</button>
        <div className="text-sm text-subtle mt-4">
          Already have an account? <Link to="/login" className="link">Sign in</Link>
        </div>
      </form>
    </div>
  )
}


