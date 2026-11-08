import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import api, { readError } from '../api'
import { formatMoney, vehicleName } from '../format'
import Field from './Field'
import Select from './Select'
import { btnPrimary, labelClass } from './ui'

//the filters as a query string, empty ones are left out
const makeQuery = (f) => {
  const p = new URLSearchParams()
  if (f.items.length) p.set('items', f.items.join(','))
  ;['from', 'to', 'kmFrom', 'kmTo', 'costFrom', 'costTo'].forEach((k) => {
    if (f[k] !== '') p.set(k, f[k])
  })
  if (f.mode === 'latest') p.set('mode', 'latest')
  return p.toString()
}

const empty = { items: [], from: '', to: '', kmFrom: '', kmTo: '', costFrom: '', costTo: '', mode: 'all' }

//a message from a pdf request that failed, the error body comes as a blob
const blobError = async (err) => {
  try {
    const text = await err.response.data.text()
    return JSON.parse(text).message || 'Could not make the report.'
  } catch {
    return readError(err).message
  }
}

//pick a car and what to put in the report, the numbers update as you choose, then download the pdf
function ReportBuilder({ vehicles, startVehicleId }) {
  const currency = useSelector((state) => state.auth.user?.currency)
  const [vehicleId, setVehicleId] = useState(startVehicleId || vehicles[0]?._id || '')
  const [filters, setFilters] = useState(empty)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  const query = makeQuery(filters)
  const key = vehicleId + '?' + query
  //result remembers what it was asked for, so loading is just a mismatch
  const preview = result && result.key === key ? result : null

  //wait a moment after the last change so a request is not sent for every key
  useEffect(() => {
    if (!vehicleId) return
    let cancelled = false
    const timer = setTimeout(() => {
      api
        .get('/reports/vehicle/' + vehicleId + '/preview?' + query)
        .then((res) => {
          if (!cancelled) setResult({ key, ...res.data })
        })
        .catch((err) => {
          if (!cancelled) setResult({ key, error: readError(err) })
        })
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [vehicleId, query, key])

  const set = (name) => (e) => setFilters({ ...filters, [name]: e.target.value })

  const toggleItem = (id) => {
    const items = filters.items.includes(id) ? filters.items.filter((i) => i !== id) : [...filters.items, id]
    setFilters({ ...filters, items })
  }

  const changeVehicle = (e) => {
    //the items of one car mean nothing for another
    setVehicleId(e.target.value)
    setFilters({ ...filters, items: [] })
  }

  const download = async () => {
    setBusy(true)
    setDownloadError('')
    try {
      const res = await api.get('/reports/vehicle/' + vehicleId + '/pdf?' + query, { responseType: 'blob' })
      const match = /filename="([^"]+)"/.exec(res.headers['content-disposition'] || '')
      const link = document.createElement('a')
      link.href = URL.createObjectURL(res.data)
      link.download = match ? match[1] : 'carvault-report.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(link.href), 4000)
    } catch (err) {
      setDownloadError(await blobError(err))
    }
    setBusy(false)
  }

  const errors = preview && preview.error ? preview.error.errors : {}
  const vehicleOptions = vehicles.map((v) => ({ value: v._id, label: vehicleName(v) + ' / ' + v.registrationNo }))
  const available = preview && !preview.error ? preview.availableItems : null
  const hasFilters = query !== ''
  const canDownload = preview && !preview.error && preview.services > 0 && !busy

  return (
    <section className="mt-14 border-2 border-ink bg-card">
      <div className="bg-ink px-5 py-4 text-white">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">service report</p>
        <h2 className="mt-1 text-xl font-bold uppercase [font-stretch:125%]">Download a PDF of one car</h2>
        <p className="mt-1 text-sm text-white/60">Choose what goes in. Everything is optional, with no filters you get every service.</p>
      </div>

      <div className="space-y-6 p-5">
        <div className="max-w-md">
          <Select label="Car" id="reportCar" name="reportCar" value={vehicleId} onChange={changeVehicle} options={vehicleOptions} />
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={labelClass}>items (none ticked means all)</p>
            {available && available.length > 0 && (
              <div className="flex gap-4 text-xs">
                <button type="button" onClick={() => setFilters({ ...filters, items: available.map((a) => a._id) })} className="underline underline-offset-4 hover:text-accent">
                  Tick all
                </button>
                <button type="button" onClick={() => setFilters({ ...filters, items: [] })} className="underline underline-offset-4 hover:text-accent">
                  Clear
                </button>
              </div>
            )}
          </div>
          {errors.items && <p className="mt-1 text-xs text-bad">{errors.items}</p>}
          {available && available.length === 0 ? (
            <p className="mt-2 border border-dashed border-line px-3 py-3 text-sm text-muted">This car has no logged services yet, so there is nothing to put in a report.</p>
          ) : (
            <ul className="mt-2 grid max-h-56 gap-px overflow-y-auto border border-line bg-line sm:grid-cols-2 sm:[&>li:last-child:nth-child(odd)]:col-span-2">
              {(available || []).map((a) => (
                <li key={a._id} className="bg-card">
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-paper">
                    <input type="checkbox" checked={filters.items.includes(a._id)} onChange={() => toggleItem(a._id)} className="h-4 w-4 shrink-0 accent-[#f26522]" />
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <span className="font-mono text-[11px] text-muted">{a.count}x</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From date" id="repFrom" type="date" value={filters.from} onChange={set('from')} error={errors.from} />
          <Field label="To date" id="repTo" type="date" value={filters.to} onChange={set('to')} error={errors.to} />
          <Field label="Odometer from (km)" id="repKmFrom" type="number" inputMode="numeric" min="0" value={filters.kmFrom} onChange={set('kmFrom')} error={errors.kmFrom} />
          <Field label="Odometer to (km)" id="repKmTo" type="number" inputMode="numeric" min="0" value={filters.kmTo} onChange={set('kmTo')} error={errors.kmTo} />
          <Field label={'Cost from (' + (currency || 'PKR') + ')'} id="repCostFrom" type="number" inputMode="decimal" min="0" value={filters.costFrom} onChange={set('costFrom')} error={errors.costFrom} />
          <Field label={'Cost to (' + (currency || 'PKR') + ')'} id="repCostTo" type="number" inputMode="decimal" min="0" value={filters.costTo} onChange={set('costTo')} error={errors.costTo} />
        </div>
        <p className="-mt-3 text-xs text-muted">The date, odometer and cost ranges apply to each service. A service with no cost entered is left out when you set a cost range.</p>

        <div>
          <p className={labelClass}>what to list for each item</p>
          <div className="mt-1.5 grid gap-px border border-ink bg-ink sm:max-w-md sm:grid-cols-2">
            {[
              { value: 'all', label: 'Every service' },
              { value: 'latest', label: 'Latest of each item' },
            ].map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={filters.mode === m.value}
                onClick={() => setFilters({ ...filters, mode: m.value })}
                className={'px-3 py-2 text-sm transition-colors ' + (filters.mode === m.value ? 'bg-ink text-white' : 'bg-card hover:bg-paper')}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">The total cost of an item always adds up all its services in the range, even when only the latest is listed.</p>
        </div>

        <div className="border border-ink bg-ink px-4 py-3 text-white" aria-live="polite">
          {!preview && <p className="font-mono text-xs uppercase tracking-widest text-white/60">counting...</p>}
          {preview && preview.error && <p className="font-mono text-xs text-lamp-red">{preview.error.message}</p>}
          {preview && !preview.error && (
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
              <div className="flex flex-wrap gap-x-8 gap-y-1 font-mono text-sm tabular-nums">
                <span>
                  <span className="text-xl">{preview.services}</span> <span className="text-xs uppercase tracking-widest text-white/60">services</span>
                </span>
                <span>
                  <span className="text-xl">{preview.items}</span> <span className="text-xs uppercase tracking-widest text-white/60">items</span>
                </span>
                <span>
                  <span className="text-xl">{formatMoney(preview.totalCost, currency)}</span> <span className="text-xs uppercase tracking-widest text-white/60">total</span>
                </span>
              </div>
              {preview.services === 0 && <p className="font-mono text-xs text-lamp-amber">nothing matches, widen the filters</p>}
            </div>
          )}
        </div>

        {downloadError && (
          <p role="alert" className="border border-bad px-3 py-2 text-sm text-bad">
            {downloadError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button onClick={download} disabled={!canDownload} className={btnPrimary}>
            {busy ? 'Making the PDF...' : 'Download PDF'}
          </button>
          {hasFilters && (
            <button type="button" onClick={() => setFilters(empty)} className="text-sm underline underline-offset-4 hover:text-accent">
              Clear all filters
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default ReportBuilder
