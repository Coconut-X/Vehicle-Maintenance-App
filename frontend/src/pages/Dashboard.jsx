import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api, { readError } from '../api'
import { daysText, formatDate, kmLeftText, vehicleName } from '../format'
import ErrorNote from '../components/ErrorNote'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import Telltale from '../components/Telltale'
import { btnPrimary, labelClass } from '../components/ui'

function Total({ label, value, tone }) {
  return (
    <div className="bg-card p-4 md:p-5">
      <p className={labelClass}>{label}</p>
      <p className={'mt-1 font-mono text-3xl ' + tone}>{value}</p>
    </div>
  )
}

function Dashboard() {
  const user = useSelector((state) => state.auth.user)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    api
      .get('/dashboard')
      .then((res) => {
        if (!cancelled) setData(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(readError(err).message)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const noVehicles = data && data.vehicles.length === 0

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className={labelClass}>dashboard</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Hello, {user?.name}.</h1>

      <div className="mt-6">
        <ErrorNote message={error} />
      </div>

      {!data && !error && <Loading />}

      {noVehicles && (
        <div className="mt-8 border border-dashed border-line bg-card p-8">
          <p className="font-medium">No vehicles yet</p>
          <p className="mt-1 max-w-md text-sm text-muted">
            Add your first vehicle and we will set up its maintenance schedule and start watching it.
          </p>
          <Link to="/vehicles/new" className={btnPrimary + ' mt-4'}>
            Add your first vehicle
          </Link>
        </div>
      )}

      {data && !noVehicles && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
            <Total label="overdue" value={data.totals.overdue} tone={data.totals.overdue > 0 ? 'text-bad' : ''} />
            <Total label="due soon" value={data.totals.due_soon} tone={data.totals.due_soon > 0 ? 'text-warn' : ''} />
            <Total label="needs data" value={data.totals.unknown} tone="text-muted" />
            <Total label="up to date" value={data.totals.up_to_date} tone="text-good" />
          </div>

          <h2 className="mt-12 font-semibold tracking-tight">Needs attention</h2>
          {data.urgent.length === 0 ? (
            <p className="mt-3 border border-line bg-card px-4 py-6 text-sm text-muted">
              Nothing is overdue or due soon. We will email you before anything falls due.
            </p>
          ) : (
            <ul className="mt-3 border border-line bg-card">
              {data.urgent.map((u) => (
                <li key={u.entryId} className="flex flex-col gap-3 border-b border-line px-4 py-3 last:border-b-0 md:flex-row md:items-center">
                  <div className="flex items-center gap-3 md:w-1/3">
                    <Telltale name={u.item.name} category={u.item.category} status={u.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{u.item.name}</p>
                      <Link to={'/vehicles/' + u.vehicle._id} className="font-mono text-xs text-muted underline-offset-4 hover:text-ink hover:underline">
                        {vehicleName(u.vehicle)} / {u.vehicle.registrationNo}
                      </Link>
                    </div>
                  </div>
                  <div className="md:flex-1">
                    <p className="font-mono text-sm">{formatDate(u.due.dueDate)}</p>
                    <p className="font-mono text-xs text-muted">
                      {daysText(u.due.remainingDays)} / by {u.due.basis === 'distance' ? 'km' : 'time'}
                      {u.due.basis === 'distance' && u.due.remainingKm !== null ? ' / ' + kmLeftText(u.due.remainingKm) : ''}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <StatusBadge status={u.status} />
                    <Link
                      to={'/vehicles/' + u.vehicle._id + '/log?item=' + u.item._id}
                      className="text-xs underline underline-offset-4 hover:text-accent"
                    >
                      Log service
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {data.totals.unknown > 0 && (
            <p className="mt-3 text-xs text-muted">
              {data.totals.unknown} {data.totals.unknown === 1 ? 'item needs' : 'items need'} data. Open the vehicle to add its km per month or to set when an item was last done.
            </p>
          )}

          <h2 className="mt-12 font-semibold tracking-tight">Your vehicles</h2>
          <ul className="mt-3 border border-line bg-card">
            {data.vehicles.map((v) => (
              <li key={v._id} className="border-b border-line last:border-b-0">
                <Link
                  to={'/vehicles/' + v._id}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-paper"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{vehicleName(v)}</p>
                    <p className="font-mono text-xs text-muted">{v.registrationNo}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="hidden font-mono text-xs text-muted sm:block">
                      {v.counts.overdue} overdue / {v.counts.due_soon} due soon
                    </p>
                    <StatusBadge status={v.summary} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default Dashboard
