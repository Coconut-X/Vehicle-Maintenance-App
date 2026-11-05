import { Link, NavLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../store/authSlice'
import { btnOutline, btnPrimary } from './ui'

function Navbar() {
  const { token, user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()

  //pages that need a login send the user to the login page by themselves
  const handleLogout = () => {
    dispatch(logout())
  }

  const linkClass = ({ isActive }) =>
    'text-sm transition-colors hover:text-ink ' + (isActive ? 'text-ink' : 'text-muted')

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center bg-ink font-mono text-xs font-medium text-accent">
              cv
            </span>
            <span className="hidden font-semibold tracking-tight sm:inline">carvault</span>
          </Link>
          {token && (
            <>
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/garage" className={linkClass}>
                Garage
              </NavLink>
              <NavLink to="/history" className={linkClass}>
                History
              </NavLink>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {token ? (
            <>
              <span className="hidden font-mono text-xs text-muted sm:inline">{user?.name}</span>
              <button onClick={handleLogout} className={btnOutline + ' !py-1.5'}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-muted transition-colors hover:text-ink">
                Log in
              </Link>
              <Link to="/register" className={btnPrimary + ' !py-1.5'}>
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

export default Navbar
