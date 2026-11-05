//bar made of small blocks like a fuel or range gauge
//part is how much of the interval is used, from 0 to 1
function SegmentBar({ part, status, segments = 10 }) {
  const lit = Math.round(part * segments)
  const colour = status === 'overdue' ? 'bg-bad' : status === 'due_soon' ? 'bg-warn' : 'bg-good'

  return (
    <div className="flex gap-[2px]" title={Math.round(part * 100) + '% of the interval used'}>
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={'h-1.5 w-3 ' + (i < lit ? colour : 'bg-line')} />
      ))}
    </div>
  )
}

export default SegmentBar
