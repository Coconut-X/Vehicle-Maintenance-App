import { useEffect, useState } from 'react'
import StatusBadge from './StatusBadge'
import SegmentBar from './SegmentBar'
import Odometer from './Odometer'
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
//a few lit windows, as [x, y], picked by hand so it does not look like a pattern
const windows = [
  [8, 146], [20, 154], [58, 128], [66, 140], [96, 156], [150, 136], [182, 152], [196, 146],
  [244, 122], [252, 134], [244, 146], [286, 158], [334, 140], [370, 150], [384, 146], [426, 132], [434, 144],
]
//trees and lamps in the middle distance
const middle = [
  { x: 30, type: 'tree' }, { x: 150, type: 'lamp' }, { x: 260, type: 'tree' }, { x: 380, type: 'lamp' },
]
//roadside marker posts on the far verge
const posts = [40, 200, 360]

function Tree({ x }) {
  return (
    <g fill="#23231f">
      <rect x={x + 7} y="146" width="4" height="26" />
      <circle cx={x + 9} cy="140" r="15" />
      <circle cx={x + 18} cy="148" r="10" />
    </g>
  )
}

//street lamp with a soft pool of light under it
function Lamp({ x }) {
  return (
    <g>
      <path d={'M ' + (x + 17) + ' 124 L ' + (x + 2) + ' 178 L ' + (x + 34) + ' 178 Z'} className="fill-accent" opacity="0.08" />
      <rect x={x} y="118" width="3" height="54" fill="#3a3a35" />
      <rect x={x} y="118" width="18" height="3" fill="#3a3a35" />
      <rect x={x + 13} y="121" width="8" height="3" className="fill-accent" />
    </g>
  )
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
          <p className="truncate text-sm font-medium">Corolla</p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">1,200 km per month</p>
        </div>
        <div className="text-right">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-white/50">odometer</p>
          <Odometer km={km} />
        </div>
      </div>

      {/*the road scene, background layers move slower than the road so it feels deep*/}
      <div className="relative overflow-hidden border-b border-white/10 bg-[#161614]">
        <svg viewBox="0 60 480 150" className="block w-full" role="img" aria-label="A car driving at night past lit buildings and street lamps">
          <g className="scroll-far">
            {[0, 480].map((offset) => (
              <g key={offset} transform={'translate(' + offset + ' 0)'}>
                {skyline.map(([x, w, h]) => (
                  <rect key={x} x={x} y={172 - h} width={w} height={h} fill="#242421" />
                ))}
                {windows.map(([x, y]) => (
                  <rect key={x + '-' + y} x={x} y={y} width="4" height="3" fill="#ffb020" opacity="0.55" />
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
          <rect x="0" y="172" width="480" height="8" fill="#232320" />
          <rect x="0" y="178" width="480" height="32" fill="#0b0b0a" />
          <line x1="0" y1="180.5" x2="480" y2="180.5" stroke="#ffffff" strokeWidth="1.5" opacity="0.2" />
          <line x1="0" y1="196" x2="480" y2="196" className="road-dash" stroke="#ffffff" strokeWidth="3" strokeDasharray="34 26" opacity="0.55" />

          {/*marker posts on the far verge, they move at road speed*/}
          <g className="scroll-near">
            {[0, 480].map((offset) => (
              <g key={offset} transform={'translate(' + offset + ' 0)'}>
                {posts.map((x) => (
                  <g key={x}>
                    <rect x={x} y="150" width="5" height="28" fill="#cfcdc5" />
                    <rect x={x} y="155" width="5" height="5" className="fill-accent" />
                  </g>
                ))}
              </g>
            ))}
          </g>

          {/*headlight beam on the road ahead*/}
          <path d="M 404 132 L 480 150 L 480 186 L 404 140 Z" fill="#fff6d8" opacity="0.10" />
          {/*scaled down so the background shows, 180 x 0.82 + 32.4 keeps the tyres on the road*/}
          <g transform="translate(38 32.4) scale(0.82)">
            <CarSide powertrain="petrol" spin bounce night />
          </g>
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
