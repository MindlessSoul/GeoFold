import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Camera, FolderKanban, Map, CreditCard, LogOut, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export function Layout() {
  const navigate = useNavigate()

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">
            <MapPin size={16} />
          </span>
          GeoFold
        </div>

        <nav className="side-nav">
          <NavLink to="/capture">
            <Camera /> Capture
          </NavLink>
          <NavLink to="/projects">
            <FolderKanban /> Projects
          </NavLink>
          <NavLink to="/map">
            <Map /> Map
          </NavLink>
          <NavLink to="/subscription">
            <CreditCard /> Subscription
          </NavLink>
        </nav>

        <div className="side-foot">
          <button className="ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={signOut}>
            <LogOut size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="content">
        <div className="container">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
