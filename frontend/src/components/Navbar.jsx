import { Link, NavLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../store/authSlice'
import Logo from './Logo'
import { btnOutline, btnPrimary } from './ui'

//links for logged in users, shown in the bar on desktop and in a second row on mobile
function AppLinks({ linkClass }) {
  return (
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
      <NavLink to="/analytics" className={linkClass}>
        Analytics
      </NavLink>
    </>
  )
}

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
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-6">
        <div className="flex h-14 items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={36} />
            <span className="hidden font-display text-lg font-bold tracking-tight [font-stretch:125%] sm:inline">carvault</span>
          </Link>
          {token && (
            <div className="hidden items-center gap-6 md:flex">
              <AppLinks linkClass={linkClass} />
            </div>
          )}
        </div>

        <div className="flex h-14 items-center gap-3">
          {token ? (
            <>
              <NavLink to="/profile" className={({ isActive }) => linkClass({ isActive }) + ' hidden font-mono !text-xs sm:inline'}>
                {user?.name}
              </NavLink>
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

        {/*on small screens the links go on their own row so nothing scrolls sideways*/}
        {token && (
          <div className="-mx-6 flex w-[calc(100%+3rem)] flex-wrap gap-x-5 gap-y-1 border-t border-line px-6 py-2.5 md:hidden">
            <AppLinks linkClass={linkClass} />
            <NavLink to="/profile" className={linkClass}>
              Profile
            </NavLink>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Navbar
