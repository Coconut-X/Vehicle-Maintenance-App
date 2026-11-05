import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { readError } from '../api'
import { daysText, formatDate, kmLeftText, formatKm } from '../format'
import Field from './Field'
import StatusBadge from './StatusBadge'
import Telltale from './Telltale'
import SegmentBar from './SegmentBar'
import { btnOutline, btnPrimary } from './ui'
import { usedPart } from '../wear'

//most urgent first, items that are turned off go last
const order = { overdue: 0, due_soon: 1, unknown: 2, up_to_date: 3, disabled: 4 }

const sortEntries = (entries) => {
  return [...entries].sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    const aDays = a.due && a.due.remainingDays !== null ? a.due.remainingDays : Infinity
    const bDays = b.due && b.due.remainingDays !== null ? b.due.remainingDays : Infinity
    return aDays - bDays
  })
}

const intervalText = (entry) => {
  const parts = []
  if (entry.intervalKm) parts.push(formatKm(entry.intervalKm))
  if (entry.intervalMonths) parts.push(entry.intervalMonths + ' mo')
  return parts.join(' / ')
}

//what the user needs to do when we cant work out a due date
const missingText = (entry, vehicle) => {
  if (entry.baselineSource === 'unknown') return 'Set when it was last done, or log a service.'
  if (entry.intervalKm && !entry.intervalMonths && !vehicle.avgMonthlyKm) return 'Add your km per month to predict this.'
  return 'Not enough data yet.'
}

//gauge under each item, fills up block by block as the job comes due
function WearBar({ entry }) {
  const used = usedPart(entry)
  if (used === null) return null
  return (
    <div className="mt-2">
      <SegmentBar part={used} status={entry.status} />
    </div>
  )
}

function DueInfo({ entry, vehicle }) {
  if (entry.status === 'disabled') {
    return <p className="font-mono text-xs text-muted">not tracked</p>
  }
  if (!entry.due || !entry.due.dueDate) {
    return <p className="text-xs text-muted">{missingText(entry, vehicle)}</p>
  }
  const d = entry.due
  return (
    <div>
      <p className="font-mono text-sm">{formatDate(d.dueDate)}</p>
      <p className="font-mono text-xs text-muted">
        {daysText(d.remainingDays)} / by {d.basis === 'distance' ? 'km' : 'time'}
        {d.basis === 'distance' && d.remainingKm !== null ? ' / ' + kmLeftText(d.remainingKm) : ''}
      </p>
      <WearBar entry={entry} />
    </div>
  )
}

//the form that opens under a row to change its intervals
function EntryEditor({ entry, onSaved, onCancel }) {
  const canSetBaseline = entry.baselineSource !== 'service'
  const startDate = entry.baselineSource !== 'unknown' && entry.baselineDate ? entry.baselineDate.slice(0, 10) : ''
  const startKm = entry.baselineSource !== 'unknown' && entry.baselineKm != null ? String(entry.baselineKm) : ''

  const [form, setForm] = useState({
    intervalKm: entry.intervalKm ? String(entry.intervalKm) : '',
    intervalMonths: entry.intervalMonths ? String(entry.intervalMonths) : '',
    baselineDate: startDate,
    baselineKm: startKm,
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const check = () => {
    const found = {}
    const whole = (v, min, max) => Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max

    if (form.intervalKm === '' && form.intervalMonths === '') {
      found.intervalKm = 'Keep at least one: km or months.'
    }
    if (form.intervalKm !== '' && !whole(form.intervalKm, 100, 200000)) found.intervalKm = '100 to 200,000.'
    if (form.intervalMonths !== '' && !whole(form.intervalMonths, 1, 120)) found.intervalMonths = '1 to 120.'
    if (form.baselineDate !== '' && new Date(form.baselineDate) > new Date()) found.baselineDate = 'Not in the future.'
    if (form.baselineKm !== '' && !whole(form.baselineKm, 0, 2000000)) found.baselineKm = '0 to 2,000,000.'
    return found
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = check()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    //empty means clear that interval
    const body = {
      intervalKm: form.intervalKm === '' ? null : Number(form.intervalKm),
      intervalMonths: form.intervalMonths === '' ? null : Number(form.intervalMonths),
    }
    //only send the baseline if it was changed, sending it marks the item as set by hand
    if (canSetBaseline && form.baselineDate !== startDate && form.baselineDate !== '') body.baselineDate = form.baselineDate
    if (canSetBaseline && form.baselineKm !== startKm && form.baselineKm !== '') body.baselineKm = Number(form.baselineKm)

    setSaving(true)
    try {
      await api.put('/schedule/' + entry._id, body)
      await onSaved()
    } catch (err) {
      setErrors(readError(err).errors)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="border-t border-line bg-paper px-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Every (km)"
          id={'km-' + entry._id}
          name="intervalKm"
          type="number"
          inputMode="numeric"
          value={form.intervalKm}
          onChange={handleChange}
          error={errors.intervalKm}
          hint="Empty = not by km"
        />
        <Field
          label="Every (months)"
          id={'mo-' + entry._id}
          name="intervalMonths"
          type="number"
          inputMode="numeric"
          value={form.intervalMonths}
          onChange={handleChange}
          error={errors.intervalMonths}
          hint="Empty = not by time"
        />
        {canSetBaseline && (
          <>
            <Field
              label="Last done (date)"
              id={'bd-' + entry._id}
              name="baselineDate"
              type="date"
              value={form.baselineDate}
              onChange={handleChange}
              error={errors.baselineDate}
            />
            <Field
              label="Last done (km)"
              id={'bk-' + entry._id}
              name="baselineKm"
              type="number"
              inputMode="numeric"
              value={form.baselineKm}
              onChange={handleChange}
              error={errors.baselineKm}
            />
          </>
        )}
      </div>
      {!canSetBaseline && (
        <p className="mt-3 text-xs text-muted">Last done comes from your service history, so it updates when you log a service.</p>
      )}
      <div className="mt-4 flex gap-3">
        <button type="submit" disabled={saving} className={btnPrimary + ' !py-1.5'}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={btnOutline + ' !py-1.5'}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function ScheduleTable({ entries, vehicle, onChanged }) {
  const [editingId, setEditingId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const toggle = async (entry) => {
    setError('')
    setBusyId(entry._id)
    try {
      await api.put('/schedule/' + entry._id, { enabled: !entry.enabled })
      await onChanged()
    } catch (err) {
      setError(readError(err).message)
    }
    setBusyId(null)
  }

  const saved = async () => {
    await onChanged()
    setEditingId(null)
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 border border-bad bg-card px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}
      <ul className="border border-line bg-card">
        {sortEntries(entries).map((entry) => (
          <li key={entry._id} className="border-b border-line last:border-b-0">
            <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
              <div className="flex items-center gap-3 md:w-1/3">
                <Telltale name={entry.item.name} category={entry.item.category} status={entry.status} />
                <div className="min-w-0">
                  <p className={'text-sm font-medium ' + (entry.enabled ? '' : 'text-muted')}>{entry.item.name}</p>
                  <p className="font-mono text-xs text-muted">
                    {entry.item.category}
                    {intervalText(entry) ? ' / every ' + intervalText(entry) : ''}
                  </p>
                </div>
              </div>
              <div className="md:flex-1">
                <DueInfo entry={entry} vehicle={vehicle} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 md:justify-end">
                <StatusBadge status={entry.status} />
                <div className="flex gap-3 whitespace-nowrap text-xs">
                  <Link
                    to={'/vehicles/' + vehicle._id + '/log?item=' + entry.item._id}
                    className="underline underline-offset-4 hover:text-accent"
                  >
                    Log service
                  </Link>
                  <button
                    onClick={() => setEditingId(editingId === entry._id ? null : entry._id)}
                    className="underline underline-offset-4 hover:text-accent"
                  >
                    {editingId === entry._id ? 'Close' : 'Edit'}
                  </button>
                  <button
                    onClick={() => toggle(entry)}
                    disabled={busyId === entry._id}
                    className="underline underline-offset-4 hover:text-accent disabled:opacity-50"
                  >
                    {entry.enabled ? 'Turn off' : 'Turn on'}
                  </button>
                </div>
              </div>
            </div>
            {editingId === entry._id && <EntryEditor entry={entry} onSaved={saved} onCancel={() => setEditingId(null)} />}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ScheduleTable
