import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export function Layout() {
  const navigate = useNavigate()

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div>
      <header className="nav">
        <span className="brand">GeoFold</span>
        <nav>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/map">Map</NavLink>
          <NavLink to="/subscription">Subscription</NavLink>
        </nav>
        <button className="ghost" onClick={signOut}>
          Sign out
        </button>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
