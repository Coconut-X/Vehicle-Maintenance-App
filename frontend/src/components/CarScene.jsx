import { useEffect, useState } from 'react'
import StatusBadge from './StatusBadge'
import { formatKm } from '../format'

//three jobs the demo car is watching, due at these odometer readings
const jobs = [
  { name: 'Engine oil change', dueKm: 55600, every: 5000 },
  { name: 'Tyre rotation', dueKm: 57200, every: 10000 },
  { name: 'Brake pads (front)', dueKm: 61500, every: 30000 },
]

const START_KM = 54200
const END_KM = 56400

//same rule as the app, overdue past the km, due soon inside 500 km
const jobStatus = (km, dueKm) => {
  if (km > dueKm) return 'overdue'
  if (dueKm - km <= 500) return 'due_soon'
  return 'up_to_date'
}

const prefersReducedMotion = () => {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

//side view of a hatchback drawn with plain svg shapes
function Car() {
  return (
    <g className="car-body">
      {/*shadow*/}
      <ellipse cx="200" cy="168" rx="150" ry="7" fill="currentColor" opacity="0.12" />
      {/*body*/}
      <path
        d="M58 140 L66 112 Q72 100 88 98 L138 94 L176 62 Q186 54 200 54 L268 54 Q284 54 294 66 L322 98 L348 104 Q362 108 364 122 L366 140 Q366 150 356 150 L68 150 Q56 150 58 140 Z"
        className="fill-ink"
      />
      {/*windows*/}
      <path d="M150 94 L182 66 Q188 62 196 62 L226 62 L226 94 Z" className="fill-paper" opacity="0.9" />
      <path d="M236 62 L266 62 Q276 62 282 70 L304 94 L236 94 Z" className="fill-paper" opacity="0.9" />
      {/*door line and handle*/}
      <line x1="231" y1="60" x2="231" y2="146" className="stroke-paper" strokeWidth="2" opacity="0.35" />
      <rect x="244" y="104" width="16" height="3" className="fill-paper" opacity="0.6" />
      {/*lights*/}
      <rect x="350" y="112" width="12" height="8" className="fill-accent" />
      <rect x="60" y="116" width="10" height="8" fill="#c2352b" />
      {/*wheels*/}
      <Wheel cx={118} />
      <Wheel cx={302} />
    </g>
  )
}

function Wheel({ cx }) {
  return (
    <g>
      <circle cx={cx} cy="150" r="24" className="fill-ink" />
      <circle cx={cx} cy="150" r="24" fill="none" className="stroke-paper" strokeWidth="2" opacity="0.25" />
      <g className="wheel-spin">
        <circle cx={cx} cy="150" r="13" className="fill-paper" />
        <line x1={cx - 12} y1="150" x2={cx + 12} y2="150" className="stroke-ink" strokeWidth="3" />
        <line x1={cx} y1="138" x2={cx} y2="162" className="stroke-ink" strokeWidth="3" />
        <circle cx={cx} cy="150" r="4" className="fill-accent" />
      </g>
    </g>
  )
}

//hero animation, the car drives, the odometer ticks and the jobs fall due one by one
function CarScene() {
  const [km, setKm] = useState(prefersReducedMotion() ? 55450 : START_KM)

  useEffect(() => {
    if (prefersReducedMotion()) return
    //about 15 seconds per loop, then it starts again like a new month
    const timer = setInterval(() => {
      setKm((k) => (k >= END_KM ? START_KM : k + 12))
    }, 80)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="border border-line bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Corolla / LEA-1234</p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">1,200 km per month</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">odometer</p>
          <p className="whitespace-nowrap font-mono text-base tabular-nums sm:text-lg">{formatKm(km)}</p>
        </div>
      </div>

      {/*the road scene*/}
      <div className="relative overflow-hidden border-b border-line bg-paper">
        <svg viewBox="0 0 420 210" className="block w-full text-ink" role="img" aria-label="A car driving along a road">
          {/*far hills*/}
          <path d="M0 120 Q60 96 120 112 T240 104 T420 110 L420 186 L0 186 Z" className="fill-line" opacity="0.6" />
          {/*road*/}
          <rect x="0" y="174" width="420" height="36" className="fill-ink" />
          <line x1="0" y1="192" x2="420" y2="192" className="road-dash stroke-paper" strokeWidth="3" strokeDasharray="22 18" />
          {/*km posts passing by*/}
          <g className="road-posts">
            {[0, 1, 2, 3].map((i) => (
              <g key={i} transform={'translate(' + (i * 140 + 40) + ' 0)'}>
                <rect x="0" y="146" width="3" height="28" className="fill-muted" />
                <rect x="-8" y="140" width="19" height="10" className="fill-accent" />
              </g>
            ))}
          </g>
          <g className="car-bob">
            <Car />
          </g>
        </svg>
      </div>

      <ul>
        {jobs.map((job) => {
          const status = jobStatus(km, job.dueKm)
          const done = Math.min(1, Math.max(0, 1 - (job.dueKm - km) / job.every))
          const left = job.dueKm - km
          return (
            <li key={job.name} className="border-b border-line px-4 py-3 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{job.name}</p>
                  <p className="font-mono text-xs tabular-nums text-muted">
                    {left >= 0 ? formatKm(left) + ' left' : formatKm(-left) + ' over'} / due at {formatKm(job.dueKm)}
                  </p>
                </div>
                <StatusBadge status={status} />
              </div>
              {/*progress along the interval, like a fuel gauge*/}
              <div className="mt-2 h-1 bg-paper">
                <div
                  className={'h-1 ' + (status === 'overdue' ? 'bg-bad' : status === 'due_soon' ? 'bg-warn' : 'bg-good')}
                  style={{ width: done * 100 + '%' }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default CarScene
