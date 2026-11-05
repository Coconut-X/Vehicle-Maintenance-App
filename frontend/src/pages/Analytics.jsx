import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api, { readError } from '../api'
import { formatKm, formatMoney, vehicleName } from '../format'
import ErrorNote from '../components/ErrorNote'
import Loading from '../components/Loading'
import Select from '../components/Select'
import Telltale from '../components/Telltale'
import { btnPrimary, labelClass } from '../components/ui'

//"2026-03" to "Mar"
const monthLabel = (m) => {
  const d = new Date(m + '-01T00:00:00Z')
  return d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })
}

//one readout of the trip computer, like the screen between the dials of a car
function Stat({ label, value, note }) {
  return (
    <div className="bg-ink p-4 md:p-5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-lamp-off">{label}</p>
      <p className="mt-1 break-words font-mono text-2xl text-white md:text-3xl">{value}</p>
      {note && <p className="mt-1 font-mono text-[11px] text-white/50">{note}</p>}
    </div>
  )
}

//cost bar made of blocks like a fuel gauge, full means the most expensive category
function CostGauge({ part }) {
  const lit = Math.max(1, Math.round(part * 20))
  return (
    <div className="flex gap-[2px]" aria-hidden="true">
      {Array.from({ length: 20 }, (_, i) => (
        <span key={i} className={'h-2 flex-1 ' + (i < lit ? 'bg-accent' : 'bg-line')} />
      ))}
    </div>
  )
}

//small box shown when hovering a bar
function ChartTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const row = payload[0].payload
  return (
    <div className="border border-ink bg-card px-3 py-2 font-mono text-xs">
      <p>{row.month}</p>
      <p className="mt-0.5">
        {formatMoney(row.cost)} / {row.count} {row.count === 1 ? 'service' : 'services'}
      </p>
    </div>
  )
}

function Analytics() {
  const [vehicleId, setVehicleId] = useState('')
  const [vehicles, setVehicles] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  //result remembers which vehicle it was loaded for, so loading is just a mismatch
  const loading = !result || result.key !== vehicleId
  const data = result ? result.data : null

  useEffect(() => {
    api
      .get('/vehicles', { params: { limit: 50 } })
      .then((res) => setVehicles(res.data.vehicles))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    const params = vehicleId ? { vehicle: vehicleId } : {}

    api
      .get('/analytics', { params })
      .then((res) => {
        if (cancelled) return
        setError('')
        setResult({ key: vehicleId, data: res.data })
      })
      .catch((err) => {
        if (cancelled) return
        setError(readError(err).message)
        setResult({ key: vehicleId, data: null })
      })

    return () => {
      cancelled = true
    }
  }, [vehicleId])

  const vehicleOptions = [
    { value: '', label: 'All vehicles' },
    ...vehicles.map((v) => ({ value: v._id, label: vehicleName(v) + ' / ' + v.registrationNo })),
  ]

  const empty = data && data.serviceCount === 0
  const maxCategory = data && data.byCategory.length ? data.byCategory[0].cost : 0

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className={labelClass}>analytics</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">What your cars cost.</h1>

      <div className="mt-6 max-w-sm">
        <Select
          label="vehicle"
          id="vehicle"
          options={vehicleOptions}
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        />
      </div>

      <div className="mt-6">
        <ErrorNote message={error} />
      </div>

      {loading && !error && <Loading />}

      {!loading && empty && (
        <div className="mt-8 border border-dashed border-line bg-card p-8">
          <p className="font-medium">No services logged yet</p>
          <p className="mt-1 max-w-md text-sm text-muted">
            Costs show up here once you log a service with a price.
          </p>
          <Link to="/garage" className={btnPrimary + ' mt-4'}>
            Go to garage
          </Link>
        </div>
      )}

      {!loading && data && !empty && (
        <>
          <div className="mt-8 border-2 border-ink bg-ink">
            <p className="flex items-center gap-2 border-b border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-accent">
              <span className="h-1.5 w-1.5 bg-accent" aria-hidden="true" />
              trip computer
            </p>
            <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-3">
              <Stat label="total spent" value={formatMoney(data.totalCost)} note={data.serviceCount + ' services logged'} />
              <Stat
                label="cost per km"
                value={data.costPerKm === null ? '-' : formatMoney(data.costPerKm)}
                note={data.costPerKm === null ? 'needs two services at different km' : 'over ' + formatKm(data.distanceKm)}
              />
              <Stat
                label="top category"
                value={data.byCategory.length ? data.byCategory[0].category : '-'}
                note={data.byCategory.length ? formatMoney(data.byCategory[0].cost) : ''}
              />
            </div>
          </div>

          <h2 className="mt-12 font-semibold tracking-tight">Last 12 months</h2>
          <div className="mt-3 border border-line bg-card p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e4e4de" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthLabel}
                    tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#6e6e68' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e4e4de' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    width={48}
                    tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#6e6e68' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatMoney(v)}
                  />
                  <Tooltip content={<ChartTip />} cursor={{ fill: '#fafaf8' }} />
                  <Bar dataKey="cost" fill="#f26522" maxBarSize={32} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <h2 className="mt-12 font-semibold tracking-tight">By category</h2>
          <ul className="mt-3 border border-line bg-card">
            {data.byCategory.map((c) => (
              <li key={c.category} className="border-b border-line px-4 py-3 last:border-b-0">
                <div className="flex items-center justify-between gap-4">
                  <p className="flex items-center gap-3 text-sm font-medium">
                    <Telltale category={c.category} status="due_soon" size="sm" />
                    {c.category}
                  </p>
                  <p className="font-mono text-sm">
                    {formatMoney(c.cost)}
                    <span className="ml-2 text-xs text-muted">
                      {c.count} {c.count === 1 ? 'service' : 'services'}
                    </span>
                  </p>
                </div>
                <div className="mt-3">
                  <CostGauge part={maxCategory ? c.cost / maxCategory : 0} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default Analytics
