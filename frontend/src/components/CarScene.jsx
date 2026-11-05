import { useEffect, useState } from 'react'
import StatusBadge from './StatusBadge'
import { formatKm } from '../format'
import CarSide from './CarSide'

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

//the scene repeats every 480 units, each layer has two copies so it can scroll forever
//far blocks of a skyline, as [x, width, height]
const skyline = [
  [0, 46, 34], [50, 30, 52], [84, 54, 26], [142, 26, 44], [172, 60, 30], [236, 34, 58],
  [274, 48, 22], [326, 28, 40], [358, 56, 30], [418, 30, 48], [452, 28, 24],
]
//trees and lamps in the middle distance
const middle = [
  { x: 30, type: 'tree' }, { x: 150, type: 'lamp' }, { x: 260, type: 'tree' }, { x: 380, type: 'lamp' },
]
//roadside marker posts close to the camera
const posts = [40, 200, 360]

function Tree({ x }) {
  return (
    <g>
      <rect x={x + 7} y="146" width="4" height="26" className="fill-muted" opacity="0.5" />
      <circle cx={x + 9} cy="140" r="15" fill="#d9d9d1" />
      <circle cx={x + 18} cy="148" r="10" fill="#d9d9d1" />
    </g>
  )
}

function Lamp({ x }) {
  return (
    <g className="fill-muted" opacity="0.55">
      <rect x={x} y="118" width="3" height="54" />
      <rect x={x} y="118" width="18" height="3" />
      <rect x={x + 14} y="121" width="7" height="3" className="fill-accent" />
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

      {/*the road scene, background layers move slower than the road so it feels deep*/}
      <div className="relative overflow-hidden border-b border-line bg-paper">
        <svg viewBox="0 60 480 150" className="block w-full text-ink" role="img" aria-label="A car driving along a road past trees and street lamps">
          <g className="scroll-far">
            {[0, 480].map((offset) => (
              <g key={offset} transform={'translate(' + offset + ' 0)'}>
                {skyline.map(([x, w, h]) => (
                  <rect key={x} x={x} y={172 - h} width={w} height={h} className="fill-line" />
                ))}
              </g>
            ))}
          </g>

          <g className="scroll-mid">
            {[0, 480].map((offset) => (
              <g key={offset} transform={'translate(' + offset + ' 0)'}>
                {middle.map((m) => (m.type === 'tree' ? <Tree key={m.x} x={m.x} /> : <Lamp key={m.x} x={m.x} />))}
              </g>
            ))}
          </g>

          {/*verge and road*/}
          <rect x="0" y="172" width="480" height="8" fill="#e9e9e3" />
          <rect x="0" y="178" width="480" height="32" fill="#2b2b28" />
          <line x1="0" y1="180.5" x2="480" y2="180.5" className="stroke-paper" strokeWidth="1.5" opacity="0.35" />
          <line x1="0" y1="196" x2="480" y2="196" className="road-dash stroke-paper" strokeWidth="3" strokeDasharray="34 26" opacity="0.85" />

          {/*marker posts on the far verge, they move at road speed*/}
          <g className="scroll-near">
            {[0, 480].map((offset) => (
              <g key={offset} transform={'translate(' + offset + ' 0)'}>
                {posts.map((x) => (
                  <g key={x}>
                    <rect x={x} y="150" width="5" height="28" className="fill-paper" stroke="#c9c9c2" strokeWidth="1" />
                    <rect x={x} y="155" width="5" height="5" className="fill-accent" />
                  </g>
                ))}
              </g>
            ))}
          </g>
          {/*shadow under the car*/}
          <ellipse cx="240" cy="181" rx="160" ry="3.5" fill="#000" opacity="0.35" />
          {/*scaled down so the background shows, 180 x 0.82 + 32.4 keeps the tyres on the road*/}
          <g transform="translate(38 32.4) scale(0.82)">
            <CarSide powertrain="petrol" spin bounce />
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
