import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

export default function ProtectedRoutes() {
  const loading = useAuthStore((s) => s.loading)
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)

  if (loading) return <div className="p-6">Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile?.base_currency) return <Navigate to="/onboarding" replace />
  return <Outlet />
}


