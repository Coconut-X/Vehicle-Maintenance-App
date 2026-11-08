import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { readError } from '../api'
import { powertrainLabel, vehicleName } from '../format'
import Odometer from '../components/Odometer'
import Field from '../components/Field'
import Select from '../components/Select'
import Plate from '../components/Plate'
import Pagination from '../components/Pagination'
import CarArt from '../components/CarArt'
import ArrangeCars from '../components/ArrangeCars'
import GroupSection, { EmptyGroup } from '../components/GroupSection'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_soon', label: 'Due soon' },
  { value: 'unknown', label: 'Needs data' },
  { value: 'up_to_date', label: 'Up to date' },
]

const sortOptions = [
  { value: '', label: 'My order' },
  { value: 'newest', label: 'Newest first' },
  { value: 'urgency', label: 'Most urgent' },
  { value: 'name', label: 'Name' },
  { value: 'year', label: 'Year' },
]

const lamp = {
  overdue: 'bg-lamp-red',
  due_soon: 'bg-lamp-amber',
  up_to_date: 'bg-lamp-green',
}

//painted parking lines, yellow like a real garage floor
const bayLines = 'border-x-[5px] border-[#e2b33c]'
//concrete floor with light coming from the top
const floor = 'bg-[radial-gradient(ellipse_at_top,#f4f3ef,#e3e2dc)]'

//every car is parked in its own bay with a number painted on the floor
function VehicleCard({ v, bay }) {
  const unfinished = v.counts.overdue + v.counts.due_soon
  const due = v.summary === 'overdue' || v.summary === 'due_soon'

  return (
    <Link to={'/vehicles/' + v._id} className="group block">
      <div className={'relative aspect-[16/10] overflow-hidden ' + bayLines + ' ' + floor}>
        {v.photoUrl ? (
          <>
            {/*a photo of the owner fills the whole bay*/}
            <img
              src={v.photoUrl}
              alt={vehicleName(v)}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <span className="absolute left-3 top-3 bg-ink/80 px-1.5 py-0.5 font-mono text-[11px] tracking-widest text-white">
              BAY {String(bay).padStart(2, '0')}
            </span>
          </>
        ) : (
          <>
            <span className="absolute left-3 top-2 font-display text-4xl font-bold text-ink/10 [font-stretch:125%]">
              {String(bay).padStart(2, '0')}
            </span>
            <div className="absolute inset-x-0 top-[12%] bottom-[14%] transition-transform duration-700 ease-out group-hover:translate-x-3">
              <CarArt powertrain={v.powertrain} className="!bg-transparent" />
            </div>
            {/*wheel stop at the back of the bay*/}
            <span className="absolute bottom-3 left-1/2 h-2 w-1/3 -translate-x-1/2 bg-[repeating-linear-gradient(90deg,#111110_0_12px,#e2b33c_12px_24px)]" />
          </>
        )}
      </div>

      <div className="bg-ink px-4 py-3 text-white transition-colors group-hover:bg-[#1d1d1b]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium group-hover:text-accent">{vehicleName(v)}</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">
              {v.year} / {powertrainLabel(v.powertrain)}
            </p>
          </div>
          <Plate number={v.registrationNo} size="sm" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <span className="text-sm">
            <Odometer km={v.projection.projectedKm ?? v.odometerKm} />
          </span>
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-white/70">
            <span className={'h-2 w-2 ' + (lamp[v.summary] || 'bg-lamp-off') + (due ? ' lamp-blink' : '')} />
            {unfinished > 0 ? unfinished + ' due' : v.summary === 'unknown' ? 'needs data' : 'all ok'}
          </span>
        </div>
      </div>
    </Link>
  )
}

//an empty bay at the end of the row, parking a new car is adding one
function EmptyBay({ bay }) {
  return (
    <Link to="/vehicles/new" className="group block">
      <div className={'relative flex aspect-[16/10] flex-col items-center justify-center ' + bayLines + ' ' + floor}>
        <span className="absolute left-3 top-2 font-display text-4xl font-bold text-ink/10 [font-stretch:125%]">
          {String(bay).padStart(2, '0')}
        </span>
        <span className="flex h-12 w-12 items-center justify-center border-2 border-dashed border-ink/30 font-mono text-2xl text-ink/40 transition-colors group-hover:border-accent group-hover:text-accent">
          +
        </span>
        <span className="mt-3 font-mono text-[11px] uppercase tracking-widest text-muted group-hover:text-ink">bay free / park a car</span>
      </div>
      <div className="border-x border-b border-dashed border-line px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">add vehicle</p>
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
  const [arranging, setArranging] = useState(false)
  //counts up after arranging so the list is loaded again
  const [reload, setReload] = useState(0)
  //null until loaded, with groups the cars are shown in parts so all of them are loaded at once
  const [groups, setGroups] = useState(null)

  //result remembers which filters it was loaded for, so loading is just a mismatch
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const grouped = groups !== null && groups.length > 0
  const limit = grouped ? 50 : 9
  const key = [search, status, sort, page, reload, limit].join('|')
  const loading = groups === null || !result || result.key !== key
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
    api
      .get('/groups')
      .then((res) => setGroups(res.data.groups))
      .catch(() => setGroups([]))
  }, [reload])

  useEffect(() => {
    if (groups === null) return
    let cancelled = false

    api
      .get('/vehicles', { params: { search, status, sort, page, limit } })
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
  }, [search, status, sort, page, reload, key, limit, groups])

  const changeFilter = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

  const filtering = search !== '' || status !== ''
  const empty = data && data.total === 0 && !grouped

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={labelClass}>garage</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your vehicles</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {data && data.total > 1 && !arranging && (
            <button onClick={() => setArranging(true)} className={btnOutline}>
              Arrange
            </button>
          )}
          <Link to="/vehicles/new" className={btnPrimary}>
            Add vehicle
          </Link>
        </div>
      </div>

      {arranging && (
        <ArrangeCars
          onDone={() => {
            setArranging(false)
            setReload((r) => r + 1)
          }}
        />
      )}

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

      {data && !grouped && data.total > 0 && (
        <div className={'mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ' + (loading ? 'opacity-60' : '')}>
          {data.vehicles.map((v, i) => (
            <VehicleCard key={v._id} v={v} bay={(data.page - 1) * 9 + i + 1} />
          ))}
          {!filtering && data.page === data.pages && <EmptyBay bay={data.total + 1} />}
        </div>
      )}

      {/*with groups every group has its own part, even one with no cars, then the cars that are only yours*/}
      {data && grouped && (
        <div className={loading ? 'opacity-60' : ''}>
          {(() => {
            let bay = 0
            const parts = groups.map((g) => ({ group: g, cars: data.vehicles.filter((v) => v.group === g._id) }))
            parts.push({ group: null, cars: data.vehicles.filter((v) => !v.group) })
            const shown = parts.filter((p) => p.cars.length > 0 || (p.group && !filtering))
            if (shown.length === 0) {
              return <p className="mt-8 border border-dashed border-line bg-card px-5 py-8 text-sm text-muted">No vehicles match. Try a different search or clear the status filter.</p>
            }
            return shown.map((p) => (
              <GroupSection key={p.group ? p.group._id : 'mine'} group={p.group} count={p.cars.length}>
                {p.cars.length === 0 ? (
                  <EmptyGroup group={p.group} />
                ) : (
                  <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {p.cars.map((v) => (
                      <VehicleCard key={v._id} v={v} bay={++bay} />
                    ))}
                    {!p.group && !filtering && <EmptyBay bay={bay + 1} />}
                  </div>
                )}
              </GroupSection>
            ))
          })()}
        </div>
      )}

      {data && !grouped && <Pagination page={data.page} pages={data.pages} total={data.total} label="vehicles" onChange={setPage} />}
    </div>
  )
}

export default Garage
