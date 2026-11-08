import { useEffect, useState } from 'react'
import api, { readError } from '../api'
import { vehicleName } from '../format'
import Plate from './Plate'
import { btnPrimary } from './ui'

//put the cars in your own order, every move is saved at once and stays after logging out
//buttons instead of dragging because dragging doesnt work with a finger
function ArrangeCars({ onDone }) {
  const [cars, setCars] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get('/vehicles', { params: { limit: 50 } })
      .then((res) => {
        if (!cancelled) setCars(res.data.vehicles)
      })
      .catch((err) => {
        if (!cancelled) setError(readError(err).message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const move = async (index, step) => {
    const to = index + step
    if (to < 0 || to >= cars.length) return

    const before = cars
    const next = [...cars]
    next[index] = cars[to]
    next[to] = cars[index]
    setCars(next)
    setError('')
    setNote('')

    try {
      await api.put('/vehicles/order', { order: next.map((c) => c._id) })
      setNote('Saved.')
    } catch (err) {
      //put it back so what is shown is what is saved
      setCars(before)
      setError(readError(err).message)
    }
  }

  const arrow = 'flex h-10 w-10 items-center justify-center border border-line bg-card font-mono text-sm transition-colors hover:border-ink disabled:opacity-30 disabled:hover:border-line'

  return (
    <section className="mt-8 border-2 border-ink bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-ink px-4 py-3 text-white">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">arrange your cars</p>
          <p className="text-sm text-white/70">Move a car up or down. This order is kept for your account.</p>
        </div>
        <button onClick={onDone} className={btnPrimary + ' !bg-white !text-ink hover:!bg-accent hover:!text-white'}>
          Done
        </button>
      </div>

      {error && (
        <p role="alert" className="border-b border-bad px-4 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      {!cars && !error && <p className="px-4 py-4 font-mono text-xs uppercase tracking-widest text-muted">loading...</p>}

      {cars && (
        <ol>
          {cars.map((car, i) => (
            <li key={car._id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <span className="w-6 shrink-0 font-mono text-[11px] text-muted">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{vehicleName(car)}</p>
                <div className="mt-1">
                  <Plate number={car.registrationNo} size="sm" />
                </div>
              </div>
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={'Move ' + vehicleName(car) + ' up'} className={arrow}>
                &uarr;
              </button>
              <button onClick={() => move(i, 1)} disabled={i === cars.length - 1} aria-label={'Move ' + vehicleName(car) + ' down'} className={arrow}>
                &darr;
              </button>
            </li>
          ))}
        </ol>
      )}

      <p aria-live="polite" className="border-t border-line px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-muted">
        {note || 'changes are saved as you go'}
      </p>
    </section>
  )
}

export default ArrangeCars
