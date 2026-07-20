import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { CapturePage } from './pages/CapturePage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectFormPage } from './pages/ProjectFormPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { MapPage } from './pages/MapPage'
import { SubscriptionPage } from './pages/SubscriptionPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/capture" replace />} />
            <Route path="/capture" element={<CapturePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/new" element={<ProjectFormPage />} />
            <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
