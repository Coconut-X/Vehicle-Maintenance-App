//registration number drawn like a real number plate
//white plate, thick black edge, and a thin inner line like the pressed metal border
function Plate({ number, size = 'md' }) {
  const text = size === 'sm' ? 'text-[11px] px-1.5 py-px' : 'text-sm px-2.5 py-0.5'

  return (
    <span className="inline-flex shrink-0 border-2 border-ink bg-white p-px" title="Registration number">
      <span className={'border border-ink/40 font-mono font-medium uppercase tracking-[0.12em] text-ink ' + text}>{number}</span>
    </span>
  )
}

export default Plate
