import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { readError } from '../api'
import { formatKm, powertrainLabel, vehicleName } from '../format'
import Field from '../components/Field'
import Select from '../components/Select'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import CarArt from '../components/CarArt'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_soon', label: 'Due soon' },
  { value: 'unknown', label: 'Needs data' },
  { value: 'up_to_date', label: 'Up to date' },
]

const sortOptions = [
  { value: '', label: 'Newest first' },
  { value: 'urgency', label: 'Most urgent' },
  { value: 'name', label: 'Name' },
  { value: 'year', label: 'Year' },
]

function VehicleCard({ v }) {
  const unfinished = v.counts.overdue + v.counts.due_soon

  return (
    <Link to={'/vehicles/' + v._id} className="group block border border-line bg-card transition-colors hover:border-ink">
      <div className="aspect-[16/9] border-b border-line bg-paper">
        {v.photoUrl ? (
          <img src={v.photoUrl} alt={vehicleName(v)} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <CarArt powertrain={v.powertrain} />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{vehicleName(v)}</p>
            <p className="font-mono text-xs text-muted">
              {v.registrationNo} / {v.year} / {powertrainLabel(v.powertrain)}
            </p>
          </div>
          <StatusBadge status={v.summary} />
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
          <div>
            <p className={labelClass}>{v.projection.projectedKm === null ? 'last reading' : 'estimated now'}</p>
            <p className="font-mono text-sm">{formatKm(v.projection.projectedKm ?? v.odometerKm)}</p>
          </div>
          <p className="font-mono text-xs text-muted">
            {unfinished > 0 ? unfinished + ' need attention' : 'nothing due'}
          </p>
        </div>
      </div>
    </Link>
  )
}

function Garage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('')
  const [page, setPage] = useState(1)

  //result remembers which filters it was loaded for, so loading is just a mismatch
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const key = [search, status, sort, page].join('|')
  const loading = !result || result.key !== key
  const data = result ? result.data : null

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

    api
      .get('/vehicles', { params: { search, status, sort, page, limit: 9 } })
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

    //ignore the answer if the filters changed before it came back
    return () => {
      cancelled = true
    }
  }, [search, status, sort, page, key])

  const changeFilter = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

  const filtering = search !== '' || status !== ''
  const empty = data && data.total === 0

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={labelClass}>garage</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your vehicles</h1>
        </div>
        <Link to="/vehicles/new" className={btnPrimary}>
          Add vehicle
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Field
          label="Search"
          id="search"
          type="search"
          placeholder="make, model, nickname or reg"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Select label="Status" id="status" value={status} onChange={changeFilter(setStatus)} options={statusOptions} />
        <Select label="Sort by" id="sort" value={sort} onChange={changeFilter(setSort)} options={sortOptions} />
      </div>

      {error && (
        <p role="alert" className="mt-6 border border-bad bg-card px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      {loading && !data && <p className="mt-10 font-mono text-xs uppercase tracking-widest text-muted">loading...</p>}

      {empty && !loading && (
        <div className="mt-8 border border-dashed border-line bg-card p-8">
          {filtering ? (
            <>
              <p className="font-medium">No vehicles match</p>
              <p className="mt-1 text-sm text-muted">Try a different search or clear the status filter.</p>
              <button
                onClick={() => {
                  setSearchInput('')
                  setStatus('')
                }}
                className={btnOutline + ' mt-4'}
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="font-medium">Your garage is empty</p>
              <p className="mt-1 max-w-md text-sm text-muted">
                Add your first vehicle and we will set up its full maintenance schedule.
              </p>
              <Link to="/vehicles/new" className={btnPrimary + ' mt-4'}>
                Add your first vehicle
              </Link>
            </>
          )}
        </div>
      )}

      {data && data.total > 0 && (
        <div className={'mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ' + (loading ? 'opacity-60' : '')}>
          {data.vehicles.map((v) => (
            <VehicleCard key={v._id} v={v} />
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} pages={data.pages} total={data.total} label="vehicles" onChange={setPage} />}
    </div>
  )
}

export default Garage
