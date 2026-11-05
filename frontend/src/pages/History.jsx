import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api, { readError } from '../api'
import { formatDate, formatKm, formatMoney, vehicleName } from '../format'
import ConfirmBox from '../components/ConfirmBox'
import ErrorNote from '../components/ErrorNote'
import Field from '../components/Field'
import Loading from '../components/Loading'
import Pagination from '../components/Pagination'
import Select from '../components/Select'
import Telltale from '../components/Telltale'
import Plate from '../components/Plate'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

const categoryOptions = [
  { value: '', label: 'All categories' },
  ...['Engine', 'Brakes', 'Fluids', 'Tyres', 'Electrical', 'Filters', 'Inspection'].map((c) => ({ value: c, label: c })),
]

//one dropdown picks both the sort key and the direction
const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'cost_high', label: 'Highest cost' },
  { value: 'cost_low', label: 'Lowest cost' },
]

const sortParams = {
  newest: { order: 'desc' },
  oldest: { order: 'asc' },
  cost_high: { sort: 'cost', order: 'desc' },
  cost_low: { sort: 'cost', order: 'asc' },
}

//cream paper with ruled lines like the service book that comes in the glovebox
const pageLines = 'bg-[#f7f2e4] bg-[repeating-linear-gradient(transparent_0_27px,#ebe2c9_27px_28px)]'

//a box on the service book page, label on top and the value written on a dotted line
function BookField({ label, value }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-[#8a7d5c]">{label}</dt>
      <dd className="mt-0.5 border-b border-dotted border-[#8a7d5c] pb-0.5 font-mono text-xs whitespace-nowrap sm:text-sm">{value}</dd>
    </div>
  )
}

//workshop rubber stamp, every one is tilted a little different so they dont look copy pasted
function Stamp({ record }) {
  const tilt = (parseInt(record._id.slice(-2), 16) % 11) - 7
  const date = new Date(record.serviceDate)
  const short = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  return (
    <div
      className="w-36 border-[3px] border-double border-[#2b4c9b] px-2 py-1.5 text-center font-mono uppercase text-[#2b4c9b] opacity-85 mix-blend-multiply"
      style={{ transform: 'rotate(' + tilt + 'deg)' }}
    >
      <p className="text-[9px] tracking-[0.3em]">serviced</p>
      <p className="truncate border-y border-[#2b4c9b] py-0.5 text-xs font-bold">{record.workshop || 'self service'}</p>
      <p className="text-[9px] tracking-widest">{short}</p>
    </div>
  )
}

//receipt clipped to the page, a small paper clip sits on top
function Receipt({ url }) {
  if (!url) return null

  const isPdf = url.toLowerCase().endsWith('.pdf')
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label="Open receipt"
      className="relative block h-16 w-14 shrink-0 rotate-3 border border-line bg-white shadow-[2px_2px_0_rgba(0,0,0,0.12)] transition-transform hover:rotate-0"
    >
      <span className="absolute -top-2 left-3 h-5 w-2 border-2 border-[#9a9a94]" aria-hidden="true" />
      {isPdf ? (
        <span className="flex h-full items-center justify-center font-mono text-[10px] uppercase">pdf</span>
      ) : (
        <img src={url} alt="Receipt" loading="lazy" className="h-full w-full object-cover" />
      )}
    </a>
  )
}

function History() {
  const [searchParams] = useSearchParams()

  //filters
  const [vehicleId, setVehicleId] = useState(searchParams.get('vehicle') || '')
  const [category, setCategory] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sortChoice, setSortChoice] = useState('newest')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)

  const [vehicles, setVehicles] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const [deletingId, setDeletingId] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  //result remembers which filters it was loaded for, so loading is just a mismatch
  const key = [vehicleId, category, search, from, to, sortChoice, page, reload].join('|')
  const loading = !result || result.key !== key
  const data = result ? result.data : null

  //vehicles for the dropdown
  useEffect(() => {
    api
      .get('/vehicles', { params: { limit: 50 } })
      .then((res) => setVehicles(res.data.vehicles))
      .catch(() => {})
  }, [])

  //wait a bit after typing so we dont send a request for every letter
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false

    const params = { page, limit: 10, ...sortParams[sortChoice] }
    if (vehicleId) params.vehicle = vehicleId
    if (category) params.category = category
    if (search) params.search = search
    if (from) params.from = from
    if (to) params.to = to

    api
      .get('/services', { params })
      .then((res) => {
        if (cancelled) return
        setError('')
        setResult({ key, data: res.data })
      })
      .catch((err) => {
        if (cancelled) return
        setError(readError(err).message)
        setResult({ key, data: null })
      })

    return () => {
      cancelled = true
    }
  }, [vehicleId, category, search, from, to, sortChoice, page, key])

  const changeFilter = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

  const clearFilters = () => {
    setVehicleId('')
    setCategory('')
    setSearchInput('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  const handleDelete = async (record) => {
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await api.delete('/services/' + record._id)
      setDeletingId(null)
      //if that was the last row on this page go back one page
      if (data.records.length === 1 && page > 1) setPage(page - 1)
      setReload((r) => r + 1)
    } catch (err) {
      setDeleteError(readError(err).message)
    }
    setDeleteBusy(false)
  }

  const vehicleOptions = [{ value: '', label: 'All vehicles' }].concat(
    vehicles.map((v) => ({ value: v._id, label: vehicleName(v) + ' (' + v.registrationNo + ')' }))
  )
  const filtering = vehicleId || category || search || from || to
  const empty = data && data.total === 0

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className={labelClass}>history</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Service book</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Every job you have logged, with receipts. To add one, open a vehicle and use Log service on a schedule item.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Vehicle" id="vehicle" value={vehicleId} onChange={changeFilter(setVehicleId)} options={vehicleOptions} />
        <Select label="Category" id="category" value={category} onChange={changeFilter(setCategory)} options={categoryOptions} />
        <Select label="Sort by" id="sort" value={sortChoice} onChange={changeFilter(setSortChoice)} options={sortOptions} />
        <Field
          label="Search"
          id="search"
          type="search"
          placeholder="workshop or notes"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Field label="From" id="from" type="date" value={from} onChange={changeFilter(setFrom)} />
        <Field label="To" id="to" type="date" value={to} onChange={changeFilter(setTo)} />
      </div>

      <div className="mt-6">
        <ErrorNote message={error} />
      </div>

      {loading && !data && <Loading />}

      {empty && !loading && (
        <div className="mt-8 border border-dashed border-line bg-card p-8">
          {filtering ? (
            <>
              <p className="font-medium">No records match</p>
              <p className="mt-1 text-sm text-muted">Try fewer filters or a wider date range.</p>
              <button onClick={clearFilters} className={btnOutline + ' mt-4'}>
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="font-medium">No services logged yet</p>
              <p className="mt-1 max-w-md text-sm text-muted">
                Open a vehicle and use Log service on any item once the job is done. It will appear here.
              </p>
              <Link to="/garage" className={btnPrimary + ' mt-4'}>
                Open garage
              </Link>
            </>
          )}
        </div>
      )}

      {data && data.total > 0 && (
        <ol className={'relative mt-10 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[13px] before:w-px before:bg-ink/25 ' + (loading ? 'opacity-60' : '')}>
          {data.records.map((r) => (
            <li key={r._id} className="relative pl-11">
              {/*the warning lamp of the item is the dot on the timeline*/}
              <span className="absolute left-0 top-4">
                <Telltale name={r.item.name} category={r.item.category} size="sm" />
              </span>

              <div className={'relative overflow-hidden border border-[#d9cfb4] ' + pageLines}>
                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#8a7d5c]">
                      job no {r._id.slice(-5).toUpperCase()} / {r.item.category}
                    </p>
                    <p className="mt-1 font-display text-xl font-bold uppercase leading-tight [font-stretch:125%]">{r.item.name}</p>
                    {r.vehicle && (
                      <div className="mt-2 flex items-center gap-2">
                        <Plate number={r.vehicle.registrationNo} size="sm" />
                        <span className="font-mono text-xs text-muted">{vehicleName(r.vehicle)}</span>
                      </div>
                    )}

                    <dl className="mt-4 grid max-w-md grid-cols-3 gap-4">
                      <BookField label="date" value={formatDate(r.serviceDate)} />
                      <BookField label="odometer" value={formatKm(r.odometerKm)} />
                      <BookField label="cost" value={r.cost !== undefined && r.cost !== null ? formatMoney(r.cost) : '-'} />
                    </dl>
                    {r.notes && (
                      <p className="mt-4 max-w-md text-sm italic text-[#4a4433]">
                        <span className="not-italic font-mono text-[10px] uppercase tracking-widest text-[#8a7d5c]">remarks </span>
                        {r.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-5 sm:flex-col sm:items-end">
                    <Stamp record={r} />
                    <Receipt url={r.receiptUrl} />
                  </div>
                </div>

                <div className="flex justify-end border-t border-[#e3d9bf] px-5 py-2">
                  <button
                    onClick={() => {
                      setDeleteError('')
                      setDeletingId(deletingId === r._id ? null : r._id)
                    }}
                    className="font-mono text-[11px] uppercase tracking-widest text-[#8a7d5c] underline underline-offset-4 hover:text-bad"
                  >
                    Delete entry
                  </button>
                </div>
              </div>

              {deletingId === r._id && (
                <div className="mt-2">
                  <ConfirmBox
                    title={'Delete ' + r.item.name + ' from ' + formatDate(r.serviceDate) + '?'}
                    text="This record and its receipt are removed for good. The schedule goes back to the previous service of this item."
                    confirmLabel="Delete record"
                    busy={deleteBusy}
                    error={deleteError}
                    onConfirm={() => handleDelete(r)}
                    onCancel={() => setDeletingId(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {data && <Pagination page={data.page} pages={data.pages} total={data.total} label="records" onChange={setPage} />}
    </div>
  )
}

export default History
