import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { btnPrimary, labelClass } from '../components/ui'

//placeholder, the real dashboard is built after the garage pages
function Dashboard() {
  const user = useSelector((state) => state.auth.user)

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className={labelClass}>dashboard</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Hello, {user?.name}.</h1>

      <div className="mt-8 border border-dashed border-line bg-card p-8">
        <p className="font-medium">The overview is coming soon</p>
        <p className="mt-1 max-w-md text-sm text-muted">
          Everything that is due across your vehicles will show up here. For now, your garage has all your vehicles and their
          schedules.
        </p>
        <Link to="/garage" className={btnPrimary + ' mt-4'}>
          Open garage
        </Link>
      </div>
    </div>
  )
}

export default Dashboard
