//shows a km reading as separate digit boxes like the odometer in a car
function Odometer({ km }) {
  const digits = String(Math.max(0, Math.round(km || 0))).padStart(6, '0').split('')

  return (
    <span className="inline-flex items-center gap-1" aria-label={(km || 0).toLocaleString('en-US') + ' km'}>
      <span className="inline-flex gap-px bg-ink p-px" aria-hidden="true">
        {digits.map((d, i) => (
          <span key={i} className="w-[1.15em] bg-ink py-0.5 text-center font-mono tabular-nums text-white">
            {d}
          </span>
        ))}
      </span>
      <span className="font-mono text-xs text-muted" aria-hidden="true">
        km
      </span>
    </span>
  )
}

export default Odometer
