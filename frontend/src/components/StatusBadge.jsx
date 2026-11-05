//status is always shown as text too, not only colour
const styles = {
  overdue: { label: 'Overdue', cls: 'border-bad text-bad' },
  due_soon: { label: 'Due soon', cls: 'border-warn text-warn' },
  up_to_date: { label: 'Up to date', cls: 'border-good text-good' },
  unknown: { label: 'Needs data', cls: 'border-line text-muted' },
  disabled: { label: 'Off', cls: 'border-line text-muted' },
}

function StatusBadge({ status }) {
  const s = styles[status] || styles.unknown
  return (
    <span className={'inline-block shrink-0 whitespace-nowrap border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ' + s.cls}>
      {s.label}
    </span>
  )
}

export default StatusBadge
