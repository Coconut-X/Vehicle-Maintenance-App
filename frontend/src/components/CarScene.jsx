import { useEffect, useState } from 'react'
import StatusBadge from './StatusBadge'
import SegmentBar from './SegmentBar'
import Odometer from './Odometer'
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

//the scene is 480 x 200 units, the background photo is 1536 px wide so 1 px = 0.3125 units
//it is split into three strips that scroll at different speeds, far things move slower
//each strip file is the photo strip followed by its mirror image so it loops without a seam
const K = 480 / 1536
const layers = [
  { name: 'sky', top: 0, height: 488, className: 'scroll-sky' },
  { name: 'barrier', top: 488, height: 57, className: 'scroll-barrier' },
  { name: 'road', top: 545, height: 319, className: 'scroll-road' },
]
//moves the photo up so its bottom edge sits at the bottom of the scene
const BG_Y = 200 - 864 * K

//where the supercar photo goes, it is 1422 x 374 and scaled to 330 units wide
//its tyres touch the bottom of the photo, that lands on the near lane at y 161
const CAR = { scale: 330 / 1422, x: 75 }
CAR.y = 161 - 371 * CAR.scale
//wheel centres in the photo, the tyre radius there is 117 pixels
const wheels = [
  { name: 'rear', cx: 249, cy: 254 },
  { name: 'front', cx: 1088, cy: 257 },
]
//time for one turn so the tyres match the road speed of 120 units a second
const WHEEL_TURN = ((2 * Math.PI * 117 * CAR.scale) / 120).toFixed(2)

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
        <svg viewBox="0 0 480 200" className="block w-full" role="img" aria-label="An orange supercar driving along a city waterfront at night">
          {layers.map((l) => (
            <g key={l.name} className={l.className}>
              {[0, 960].map((offset) => (
                <image
                  key={offset}
                  href={'/cars/scene-' + l.name + '.webp'}
                  x={offset}
                  y={BG_Y + l.top * K}
                  width="960"
                  height={l.height * K}
                  preserveAspectRatio="none"
                />
              ))}
            </g>
          ))}

          {/*headlight beam on the road ahead*/}
          <path d="M 378 128 L 480 146 L 480 172 L 378 134 Z" fill="#fff6d8" opacity="0.10" />
          {/*shadow under the car*/}
          <ellipse cx="242" cy="161" rx="158" ry="4" fill="#000" opacity="0.75" />

          {/*the car is a photo made with figma, keyed out so it sits on the road*/}
          <g className="car-bob">
            <image href="/cars/supercar.webp" x={CAR.x} y={CAR.y} width={1422 * CAR.scale} height={374 * CAR.scale} />
          </g>
          {/*the real wheels are cut out of the photo and laid on top so they can turn*/}
          {wheels.map((wh) => (
            <image
              key={wh.name}
              href={'/cars/supercar-wheel-' + wh.name + '.webp'}
              x={CAR.x + (wh.cx - 119) * CAR.scale}
              y={CAR.y + (wh.cy - 119) * CAR.scale}
              width={238 * CAR.scale}
              height={238 * CAR.scale}
              className="wheel-spin"
              style={{ animationDuration: WHEEL_TURN + 's' }}
            />
          ))}
        </svg>
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
