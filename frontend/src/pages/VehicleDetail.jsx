import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import api, { readError } from '../api'
import { formatDate, formatKm, powertrainLabel, vehicleName } from '../format'
import ConfirmBox from '../components/ConfirmBox'
import ScheduleTable from '../components/ScheduleTable'
import StatusBadge from '../components/StatusBadge'
import Plate from '../components/Plate'
import CarArt from '../components/CarArt'
import Odometer from '../components/Odometer'
import HealthMap from '../components/HealthMap'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

function Stat({ label, value, note }) {
  return (
    <div className="bg-card p-4">
      <p className={labelClass}>{label}</p>
      <div className="mt-1 font-mono text-lg">{value}</div>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  )
}

function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  //result remembers which vehicle it is for, so loading is just a mismatch
  const [result, setResult] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([api.get('/vehicles/' + id), api.get('/vehicles/' + id + '/schedule')])
      .then(([v, s]) => {
        if (cancelled) return
        setResult({
          id,
          vehicle: v.data.vehicle,
          projection: v.data.projection,
          schedule: s.data.schedule,
          summary: s.data.summary,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setResult({ id, error: readError(err).message })
      })

    return () => {
      cancelled = true
    }
  }, [id])

  //called after an interval or on/off change so the due dates update
  const reloadSchedule = async () => {
    const res = await api.get('/vehicles/' + id + '/schedule')
    setResult((r) => ({ ...r, schedule: res.data.schedule, summary: res.data.summary }))
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete('/vehicles/' + id)
      navigate('/garage')
    } catch (err) {
      setDeleteError(readError(err).message)
      setDeleting(false)
    }
  }

  if (!result || result.id !== id) {
    return <p className="mx-auto max-w-6xl px-6 py-12 font-mono text-xs uppercase tracking-widest text-muted">loading...</p>
  }

  if (result.error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="font-medium">We could not open this vehicle</p>
        <p className="mt-1 text-sm text-muted">{result.error}</p>
        <Link to="/garage" className={btnOutline + ' mt-4'}>
          Back to garage
        </Link>
      </div>
    )
  }

  const { vehicle, projection, schedule, summary } = result
  const name = vehicleName(vehicle)
  const warning = location.state?.warning
  const notice = location.state?.notice

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link to="/garage" className="font-mono text-xs uppercase tracking-widest text-muted hover:text-ink">
        &larr; garage
      </Link>

      <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-5">
          {vehicle.photoUrl ? (
            <img src={vehicle.photoUrl} alt={name} className="hidden aspect-[16/9] w-40 border border-line object-cover sm:block" />
          ) : (
            <div className="hidden aspect-[16/9] w-40 shrink-0 border border-line sm:block">
              <CarArt powertrain={vehicle.powertrain} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
              <StatusBadge status={summary} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Plate number={vehicle.registrationNo} />
              <span className="font-mono text-xs text-muted">
                {vehicle.nickname ? vehicle.make + ' ' + vehicle.model + ' / ' : ''}
                {vehicle.year} / {powertrainLabel(vehicle.powertrain)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={'/vehicles/' + id + '/log'} className={btnPrimary}>
            Log service
          </Link>
          <Link to={'/history?vehicle=' + id} className={btnOutline}>
            History
          </Link>
          <Link to={'/vehicles/' + id + '/edit'} className={btnOutline}>
            Edit
          </Link>
          <button onClick={() => setConfirming(true)} className={btnOutline + ' hover:!bg-bad hover:!border-bad'}>
            Delete
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-6 border border-good bg-card px-3 py-2 text-sm text-good">
          {notice}
        </p>
      )}

      {warning && (
        <p role="status" className="mt-6 border border-warn bg-card px-3 py-2 text-sm text-warn">
          {warning}
        </p>
      )}

      {confirming && (
        <div className="mt-6">
          <ConfirmBox
            title={'Delete ' + name + ' (' + vehicle.registrationNo + ')?'}
            text="This permanently removes the vehicle, its maintenance schedule and its whole service history. It cannot be undone."
            confirmLabel={'Delete ' + name}
            busy={deleting}
            error={deleteError}
            onConfirm={handleDelete}
            onCancel={() => setConfirming(false)}
          />
        </div>
      )}

      <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3">
        <Stat
          label={projection.projectedKm === null ? 'last reading' : 'estimated odometer'}
          value={<Odometer km={projection.projectedKm ?? vehicle.odometerKm} />}
          note={projection.projectedKm === null ? '' : 'projected from your last reading'}
        />
        <Stat label="last real reading" value={formatKm(vehicle.odometerKm)} note={'on ' + formatDate(vehicle.odometerDate)} />
        <Stat
          label="km per month"
          value={vehicle.avgMonthlyKm ? vehicle.avgMonthlyKm.toLocaleString('en-US') : '-'}
          note={vehicle.avgMonthlyKm ? (vehicle.usageDerived ? 'worked out from your history' : 'your estimate') : ''}
        />
      </div>

      {!vehicle.avgMonthlyKm && (
        <p className="mt-4 border border-warn bg-card px-3 py-2 text-sm text-warn">
          Add how many km you drive per month so we can predict km-based jobs.{' '}
          <Link to={'/vehicles/' + id + '/edit'} className="underline underline-offset-4">
            Add it now
          </Link>
        </p>
      )}

      <HealthMap entries={schedule} vehicleId={id} />

      <div className="mt-10 flex gap-6 border-b border-line">
        <span className="-mb-px border-b-2 border-ink pb-2 text-sm font-medium">Schedule</span>
      </div>

      <div className="mt-6">
        <ScheduleTable entries={schedule} vehicle={vehicle} onChanged={reloadSchedule} />
      </div>
    </div>
  )
}

export default VehicleDetail
