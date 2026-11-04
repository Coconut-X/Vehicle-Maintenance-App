import { useSelector } from 'react-redux'
import { labelClass } from '../components/ui'

//placeholder, the real dashboard is built after the garage pages
function Dashboard() {
  const user = useSelector((state) => state.auth.user)

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className={labelClass}>dashboard</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Hello, {user?.name}.</h1>

      <div className="mt-8 border border-dashed border-line bg-card p-8">
        <p className="font-medium">No vehicles yet</p>
        <p className="mt-1 max-w-md text-sm text-muted">
          Your garage and everything that is due will show up here once you add a vehicle.
        </p>
      </div>
    </div>
  )
}

export default Dashboard
