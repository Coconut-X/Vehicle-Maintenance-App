import { useId } from 'react'

//little moving drawing of a car part, used goes 0 to 1 and the part wears out with it
//oil and coolant drop, tread gets thin, the disc heats up, battery cells go out, the filter gets dirty

const lampText = {
  overdue: 'text-lamp-red',
  due_soon: 'text-lamp-amber',
  up_to_date: 'text-lamp-green',
}

const frame = 'rgba(255,255,255,0.55)'
const faint = 'rgba(255,255,255,0.12)'

//liquid with a moving surface, level 0 is empty and 1 is full
function Liquid({ clip, x, y, w, h, level, bubbles }) {
  const top = y + h - level * h
  //one long wavy line, it slides sideways forever so the surface looks alive
  let wave = 'M' + (x - 20) + ' ' + top
  for (let i = 0; i < 8; i++) wave += ' q4 -2.5 8 0 t8 0'
  wave += ' V' + (y + h + 2) + ' H' + (x - 20) + 'Z'

  return (
    <>
      <clipPath id={clip}>
        <rect x={x} y={y} width={w} height={h} />
      </clipPath>
      <g clipPath={'url(#' + clip + ')'}>
        <path className="fluid-wave" d={wave} fill="currentColor" opacity="0.85" />
        {bubbles &&
          [0, 1, 2].map((i) => (
            <circle
              key={i}
              className="fluid-bubble"
              cx={x + 6 + i * 8}
              cy={y + h - 3}
              r="1.6"
              fill="#0a0a0a"
              style={{ animationDelay: i * 0.7 + 's' }}
            />
          ))}
      </g>
    </>
  )
}

//engine oil, a sump with min and max marks
function Oil({ used, clip }) {
  return (
    <>
      <path d="M14 16h36v36H14z" fill="none" stroke={frame} strokeWidth="1.5" />
      <Liquid clip={clip} x={15} y={17} w={34} h={34} level={Math.max(0.06, 1 - used)} />
      <path d="M52 20h5 M52 48h5" stroke={frame} strokeWidth="1.5" />
      <text x="58" y="19" fill={frame} fontSize="5" fontFamily="monospace" textAnchor="end" dy="-2">MAX</text>
      <text x="58" y="56" fill={frame} fontSize="5" fontFamily="monospace" textAnchor="end">MIN</text>
      <path d="M26 16V8h12v8" fill="none" stroke={frame} strokeWidth="1.5" />
    </>
  )
}

//tyre that keeps rolling, the tread blocks get shorter as the tyre wears
function Tyre({ used }) {
  const depth = 1.2 + 5 * (1 - used)
  return (
    <g className="part-spin">
      {Array.from({ length: 18 }).map((_, i) => (
        <rect key={i} x="30.5" y={10 - depth} width="3" height={depth} fill="currentColor" transform={'rotate(' + i * 20 + ' 32 32)'} />
      ))}
      <circle cx="32" cy="32" r="22" fill="none" stroke={frame} strokeWidth="1.5" />
      <circle cx="32" cy="32" r="14" fill="none" stroke={frame} strokeWidth="1.5" />
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d="M32 22v-6" stroke={frame} strokeWidth="2" transform={'rotate(' + a + ' 32 32)'} />
      ))}
      <circle cx="32" cy="32" r="3" fill={frame} />
    </g>
  )
}

//brake disc spinning inside a still caliper, it glows hotter as the pads wear
function Brake({ used, due }) {
  const pad = 1 + 3.5 * (1 - used)
  return (
    <>
      <circle cx="30" cy="32" r="22" fill="currentColor" opacity={0.08 + used * 0.35} className={due ? 'heat-pulse' : ''} />
      <g className="part-spin">
        <circle cx="30" cy="32" r="22" fill="none" stroke={frame} strokeWidth="1.5" />
        <circle cx="30" cy="32" r="9" fill="none" stroke={frame} strokeWidth="1.5" />
        {Array.from({ length: 10 }).map((_, i) => (
          <circle key={i} cx="30" cy="17" r="1.3" fill={frame} transform={'rotate(' + i * 36 + ' 30 32)'} />
        ))}
      </g>
      <path d="M44 18h12v28H44z" fill="#0a0a0a" stroke="currentColor" strokeWidth="1.5" />
      <rect x={44 - pad} y="22" width={pad} height="20" fill="currentColor" />
    </>
  )
}

//battery with five cells, they go out one by one, the last one blinks when its due
//a lightning bolt on top means it is the drive battery of a hybrid or electric car
function Battery({ used, due, electric }) {
  const lit = Math.max(1, Math.round((1 - used) * 5))
  return (
    <>
      <path d="M8 19h44v26H8z M52 26h4v12h-4" fill="none" stroke={frame} strokeWidth="1.5" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={11 + i * 8.2}
          y="22"
          width="6.6"
          height="20"
          fill={i < lit ? 'currentColor' : faint}
          className={due && i === lit - 1 ? 'lamp-blink' : ''}
        />
      ))}
      {electric && <path d="M34 23l-8 10h6l-3 9 9-12h-6z" fill="#0a0a0a" stroke={frame} strokeWidth="1" strokeLinejoin="round" />}
    </>
  )
}

//coolant bottle with bubbles, the level drops as it ages
function Coolant({ used, clip }) {
  return (
    <>
      <path d="M18 14h28v40H18z M27 14V8h10v6" fill="none" stroke={frame} strokeWidth="1.5" />
      <Liquid clip={clip} x={19} y={15} w={26} h={38} level={Math.max(0.06, 1 - used)} bubbles />
      <path d="M46 22h4 M46 46h4" stroke={frame} strokeWidth="1.5" />
    </>
  )
}

//pleated filter with air going through it, dirt builds up as it gets used
function Filter({ used }) {
  const dots = []
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 7; c++) dots.push([17 + c * 5 + (r % 2) * 2.5, 22 + r * 6])
  }
  return (
    <>
      <path d="M2 24h10 M2 32h10 M2 40h10 M52 24h10 M52 32h10 M52 40h10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" className="air-flow" />
      <path d="M12 16h40v32H12z" fill="none" stroke={frame} strokeWidth="1.5" />
      <path d="M14 18l3 28 3-28 3 28 3-28 3 28 3-28 3 28 3-28 3 28 3-28 3 28 3-28" fill="none" stroke={frame} strokeWidth="1" />
      {dots.map(([x, y]) => (
        <circle key={x + '-' + y} cx={x} cy={y} r="1.6" fill="#8a7550" opacity={used * 0.9} />
      ))}
    </>
  )
}

const parts = {
  engine: Oil,
  tyres: Tyre,
  brakes: Brake,
  battery: Battery,
  fluids: Coolant,
  filters: Filter,
}

function PartGauge({ kind, used = 0, status, electric = false, className = '' }) {
  //svg ids cant have the colons react puts in useId
  const clip = 'clip' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const Part = parts[kind]
  const due = status === 'overdue' || status === 'due_soon'
  if (!Part) return null

  return (
    <svg viewBox="0 0 64 64" className={(lampText[status] || 'text-lamp-off') + ' ' + className} aria-hidden="true">
      <Part used={used} due={due} clip={clip} electric={electric} />
    </svg>
  )
}

export default PartGauge
