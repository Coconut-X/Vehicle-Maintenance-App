import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../store/authSlice'
import Logo from './Logo'
import { btnOutline, btnPrimary } from './ui'

const pages = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/garage', label: 'Garage' },
  { to: '/history', label: 'History' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/groups', label: 'Family' },
]

function Navbar() {
  const { token, user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)

  //pages that need a login send the user to the login page by themselves
  const handleLogout = () => {
    setOpen(false)
    dispatch(logout())
  }

  //escape closes the phone menu
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const linkClass = ({ isActive }) =>
    'text-sm transition-colors hover:text-ink ' + (isActive ? 'text-ink' : 'text-muted')

  //big rows for fingers, the page you are on is orange
  const menuClass = ({ isActive }) =>
    'flex items-center justify-between border-b border-white/10 py-3.5 font-display text-xl font-bold uppercase [font-stretch:125%] ' +
    (isActive ? 'text-accent' : 'text-white')

  const menuPages = [...pages, { to: '/profile', label: 'Profile' }]

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={36} />
            <span className="font-display text-lg font-bold tracking-tight [font-stretch:125%]">carvault</span>
          </Link>
          {token && (
            <div className="hidden items-center gap-6 md:flex">
              {pages.map((p) => (
                <NavLink key={p.to} to={p.to} className={linkClass}>
                  {p.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {token ? (
          <>
            <div className="hidden items-center gap-3 md:flex">
              <NavLink to="/profile" className={({ isActive }) => linkClass({ isActive }) + ' font-mono !text-xs'}>
                {user?.name}
              </NavLink>
              <button onClick={handleLogout} className={btnOutline + ' !py-1.5'}>
                Log out
              </button>
            </div>

            {/*phones get one button, the links and log out are inside the menu*/}
            <button
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-[5px] border border-ink md:hidden"
            >
              <span className={'h-0.5 w-5 bg-ink transition-transform ' + (open ? 'translate-y-[7px] rotate-45' : '')} />
              <span className={'h-0.5 w-5 bg-ink transition-opacity ' + (open ? 'opacity-0' : '')} />
              <span className={'h-0.5 w-5 bg-ink transition-transform ' + (open ? '-translate-y-[7px] -rotate-45' : '')} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted transition-colors hover:text-ink">
              Log in
            </Link>
            <Link to="/register" className={btnPrimary + ' !py-1.5'}>
              Get started
            </Link>
          </div>
        )}
      </nav>

      {token && open && (
        <div id="mobile-menu" className="menu-in absolute inset-x-0 top-full border-b-2 border-accent bg-ink text-white md:hidden">
          <div className="mx-auto max-w-6xl px-6 pb-5 pt-1">
            {menuPages.map((p, i) => (
              <NavLink key={p.to} to={p.to} onClick={() => setOpen(false)} className={menuClass}>
                <span>
                  <span className="mr-3 font-mono text-[11px] font-normal tracking-widest text-white/40">0{i + 1}</span>
                  {p.label}
                </span>
                <span className="font-mono text-sm font-normal text-white/40" aria-hidden="true">
                  &rarr;
                </span>
              </NavLink>
            ))}
            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-widest text-white/50">{user?.name}</p>
              <button
                onClick={handleLogout}
                className="shrink-0 border border-white/40 px-4 py-2 text-sm font-medium transition-colors hover:bg-white hover:text-ink"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar
