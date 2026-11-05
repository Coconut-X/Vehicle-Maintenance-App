//plain svg drawing of a car, shown when a vehicle has no photo
//the small tag in the corner shows the powertrain
function CarArt({ powertrain = 'petrol', className = '' }) {
  const code = { petrol: 'ICE', hybrid: 'HEV', phev: 'PHEV', electric: 'EV' }[powertrain] || 'ICE'
  const electricish = powertrain !== 'petrol'

  return (
    <div className={'relative flex h-full w-full items-end justify-center overflow-hidden bg-paper ' + className}>
      <svg viewBox="0 0 420 200" className="w-[85%] max-w-xs text-ink" aria-hidden="true">
        <rect x="0" y="176" width="420" height="24" className="fill-line" />
        <line x1="0" y1="188" x2="420" y2="188" className="stroke-paper" strokeWidth="2" strokeDasharray="18 14" />
        <path
          d="M58 140 L66 112 Q72 100 88 98 L138 94 L176 62 Q186 54 200 54 L268 54 Q284 54 294 66 L322 98 L348 104 Q362 108 364 122 L366 140 Q366 150 356 150 L68 150 Q56 150 58 140 Z"
          className="fill-ink"
          opacity="0.88"
        />
        <path d="M150 94 L182 66 Q188 62 196 62 L226 62 L226 94 Z" className="fill-paper" opacity="0.85" />
        <path d="M236 62 L266 62 Q276 62 282 70 L304 94 L236 94 Z" className="fill-paper" opacity="0.85" />
        <rect x="350" y="112" width="12" height="8" className="fill-accent" />
        {[118, 302].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="152" r="24" className="fill-ink" />
            <circle cx={cx} cy="152" r="12" className="fill-paper" />
            <circle cx={cx} cy="152" r="4" className="fill-accent" />
          </g>
        ))}
        {/*charge port for cars with a plug or a big battery*/}
        {electricish && <rect x="84" y="106" width="14" height="10" className="fill-accent" />}
      </svg>
      <span className="absolute right-2 top-2 border border-ink bg-card px-1.5 py-0.5 font-mono text-[10px] tracking-wide">{code}</span>
    </div>
  )
}

export default CarArt
