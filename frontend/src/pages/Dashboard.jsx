import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api, { readError } from '../api'
import { daysText, formatDate, kmLeftText, vehicleName } from '../format'
import ErrorNote from '../components/ErrorNote'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import Telltale from '../components/Telltale'
import Plate from '../components/Plate'
import CarArt from '../components/CarArt'
import PartGauge from '../components/PartGauge'
import { buildSystems } from '../wear'
import { btnPrimary, labelClass } from '../components/ui'

//one readout in the dark instrument strip, the number lights up only when it matters
function Total({ label, value, tone }) {
  return (
    <div className="bg-ink p-4 md:p-5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-lamp-off">{label}</p>
      <p className={'mt-1 font-mono text-3xl tabular-nums ' + tone}>{String(value).padStart(2, '0')}</p>
    </div>
  )
}

const lampText = {
  overdue: 'text-lamp-red',
  due_soon: 'text-lamp-amber',
  up_to_date: 'text-lamp-green',
}

//one car in the garage, the photo on top and its systems as moving parts underneath
function VehicleCard({ vehicle }) {
  const name = vehicleName(vehicle)
  const systems = buildSystems(vehicle.parts, vehicle.powertrain)

  return (
    <li className="border border-line bg-card">
      <Link to={'/vehicles/' + vehicle._id} className="group block">
        <div className="relative aspect-[16/8] border-b border-line">
          {vehicle.photoUrl ? (
            <img src={vehicle.photoUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <CarArt powertrain={vehicle.powertrain} className="transition-transform duration-500 group-hover:scale-[1.03]" />
          )}
          <div className="absolute bottom-2 left-2 bg-card">
            <StatusBadge status={vehicle.summary} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium group-hover:text-accent">{name}</p>
            <p className="font-mono text-xs text-muted">
              {vehicle.counts.overdue} overdue / {vehicle.counts.due_soon} due soon
            </p>
          </div>
          <Plate number={vehicle.registrationNo} size="sm" />
        </div>

        {/*instrument strip with a moving gauge for every system of this car*/}
        <div className="flex bg-ink">
          {systems.map((s) => (
            <div key={s.key} className="flex flex-1 flex-col items-center gap-1 border-r border-white/10 py-2.5 last:border-r-0" title={s.label}>
              <PartGauge kind={s.key} used={s.used} status={s.status} electric={vehicle.powertrain !== 'petrol'} className="h-8 w-8" />
              <span className={'font-mono text-[9px] uppercase tracking-widest ' + (lampText[s.status] || 'text-white/50')}>{s.label}</span>
            </div>
          ))}
        </div>
      </Link>
    </li>
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
          <div className="mt-8 grid grid-cols-2 gap-px border border-ink bg-[#2c2c29] md:grid-cols-4">
            <Total label="overdue" value={data.totals.overdue} tone={data.totals.overdue > 0 ? 'text-lamp-red' : 'text-lamp-off'} />
            <Total label="due soon" value={data.totals.due_soon} tone={data.totals.due_soon > 0 ? 'text-lamp-amber' : 'text-lamp-off'} />
            <Total label="needs data" value={data.totals.unknown} tone={data.totals.unknown > 0 ? 'text-white' : 'text-lamp-off'} />
            <Total label="up to date" value={data.totals.up_to_date} tone="text-lamp-green" />
          </div>

          <h2 className="mt-12 font-semibold tracking-tight">Your vehicles</h2>
          <ul className="mt-3 grid gap-4 md:grid-cols-2">
            {data.vehicles.map((v) => (
              <VehicleCard key={v._id} vehicle={v} />
            ))}
          </ul>

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

        </>
      )}
    </div>
  )
}

export default Dashboard
