import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="center muted">Loading…</div>
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />

  return <>{children}</>
}
