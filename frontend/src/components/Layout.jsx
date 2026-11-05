import { Link, Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Logo from './Logo'

//navbar on top, the current page in the middle, the road footer at the bottom
function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      {/*footer is a stretch of road, kerb on top and the lane line moving like you are driving*/}
      <footer className="mt-16 bg-[#1a1a19] pt-3 text-white">
        <div className="h-2 bg-[repeating-linear-gradient(90deg,#fafaf8_0_28px,#c2352b_28px_56px)]" aria-hidden="true" />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 pt-8 pb-6">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={32} />
            <span className="font-display text-lg font-bold tracking-tight [font-stretch:125%]">carvault</span>
          </Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-widest text-white/60">
            <Link to="/dashboard" className="hover:text-accent">Dashboard</Link>
            <Link to="/garage" className="hover:text-accent">Garage</Link>
            <Link to="/history" className="hover:text-accent">History</Link>
            <Link to="/analytics" className="hover:text-accent">Analytics</Link>
          </nav>
        </div>
        <div className="lane-line h-1.5" aria-hidden="true" />
        <p className="mx-auto max-w-6xl px-6 py-5 font-mono text-[11px] uppercase tracking-widest text-white/40">
          drive safe / service on time
        </p>
      </footer>
    </div>
  )
}

export default Layout
