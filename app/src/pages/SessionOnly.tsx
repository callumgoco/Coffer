import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

export default function SessionOnly() {
  const loading = useAuthStore((s) => s.loading)
  const session = useAuthStore((s) => s.session)
  if (loading) return <div className="p-6">Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}


