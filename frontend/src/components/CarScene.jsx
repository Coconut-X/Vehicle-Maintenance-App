import { useEffect, useState } from 'react'
import StatusBadge from './StatusBadge'
import SegmentBar from './SegmentBar'
import Odometer from './Odometer'
import { formatKm } from '../format'
import NightDrive from './NightDrive'

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

//hero animation, a night drive, the odometer ticks and the jobs fall due one by one
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
    <div className="border border-white/15 bg-[#161614] text-white">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Supercar</p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">1,200 km per month</p>
        </div>
        <div className="text-right">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-white/50">odometer</p>
          <Odometer km={km} />
        </div>
      </div>

      {/*the road scene, background layers move slower than the road so it feels deep*/}
      <div className="relative overflow-hidden border-b border-white/10 bg-[#161614]">
        <NightDrive />
      </div>

      <ul>
        {jobs.map((job) => {
          const status = jobStatus(km, job.dueKm)
          const used = Math.min(1, Math.max(0, 1 - (job.dueKm - km) / job.every))
          const left = job.dueKm - km
          return (
            <li key={job.name} className="border-b border-white/10 px-4 py-3 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{job.name}</p>
                  <p className="font-mono text-xs tabular-nums text-white/50">
                    {left >= 0 ? formatKm(left) + ' left' : formatKm(-left) + ' over'} / due at {formatKm(job.dueKm)}
                  </p>
                </div>
                <StatusBadge status={status} />
              </div>
              <div className="mt-2">
                <SegmentBar part={used} status={status} track="bg-white/10" />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default CarScene
