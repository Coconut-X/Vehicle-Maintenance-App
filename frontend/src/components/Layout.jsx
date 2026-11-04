import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

//navbar on top, the current page in the middle, small footer at the bottom
function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 font-mono text-[11px] uppercase tracking-widest text-muted">
          <span>carvault</span>
          <span>web programming / fall 2026</span>
        </div>
      </footer>
    </div>
  )
}

export default Layout
