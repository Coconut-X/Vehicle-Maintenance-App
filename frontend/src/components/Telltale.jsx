//dashboard warning light for a maintenance item, like the symbols on a real instrument cluster
//the lamp lights amber when the item is due soon and red when it is overdue, otherwise it stays dark

//24 x 24 line drawings, all strokes, square ends to match the sharp look of the app
const icons = {
  oil: 'M5 10h10v7H5z M8 10V8h3v2 M15 12l6-4 M5 12L2 10.5v4L5 15 M21 12c0 .8 1 1.5 1 2.2a1 1 0 0 1-2 0c0-.7 1-1.4 1-2.2z',
  filter: 'M3 6h18v12H3z M5 7.5l2.3 9 2.3-9 2.4 9 2.4-9 2.3 9 2.3-9',
  brake: 'M12 8v5 M12 15v1.5 M4.5 6.5a8.5 8.5 0 0 0 0 11 M19.5 6.5a8.5 8.5 0 0 1 0 11',
  coolant: 'M11 3h2v9 M14 6h2 M14 9h2 M3 21c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0',
  gearbox: 'M5 5v14 M12 5v14 M19 5v7 M5 12h14',
  spark: 'M10 3h4v3h-4z M8 6h8v5H8z M10 11h4v5h-4z M12 16v3h3',
  belt: 'M7.5 6.5h9a5.5 5.5 0 0 1 0 11h-9a5.5 5.5 0 0 1 0-11z',
  tyre: 'M7 19a7.5 7.5 0 1 1 10 0 M5 19h14 M12 8v5 M12 15v1.5',
  battery: 'M3 7h18v12H3z M7 4h2v3 M15 4h2v3 M6 13h4 M14 13h4 M16 11v4',
  hv: 'M3 7h18v12H3z M7 4h2v3 M15 4h2v3 M13 9l-3 4h4l-3 4',
  wiper: 'M2 19h20 M4 19l2.5-12h11L20 19 M12 18L8 9',
  wrench: 'M14.5 4.5a4 4 0 0 0-4.9 5.2L4 15.3 6.7 18l5.6-5.6a4 4 0 0 0 5.2-4.9l-2.5 2.5-2.3-.4-.4-2.3z',
}

//circles that some icons need on top of their paths
const circles = {
  brake: [[12, 12, 6]],
  coolant: [[12, 14.5, 2.5]],
  belt: [[7.5, 12, 2.5], [16.5, 12, 2.5]],
}

//pick the symbol from the item name first, then fall back to its category
const iconFor = (name = '', category = '') => {
  const n = name.toLowerCase()
  if (n.includes('high voltage')) return 'hv'
  if (n.includes('oil filter') || n.includes('air filter') || n.includes('fuel filter') || n.includes('cabin')) return 'filter'
  if (n.includes('oil')) return 'oil'
  if (n.includes('brake')) return 'brake'
  if (n.includes('coolant')) return 'coolant'
  if (n.includes('transmission')) return 'gearbox'
  if (n.includes('spark')) return 'spark'
  if (n.includes('timing')) return 'belt'
  if (n.includes('wiper')) return 'wiper'
  if (n.includes('battery')) return 'battery'
  if (n.includes('tyre') || n.includes('wheel')) return 'tyre'
  const byCategory = {
    Engine: 'oil',
    Filters: 'filter',
    Brakes: 'brake',
    Fluids: 'coolant',
    Tyres: 'tyre',
    Electrical: 'battery',
    Inspection: 'wrench',
  }
  return byCategory[category] || 'wrench'
}

const lampColor = {
  overdue: 'text-lamp-red',
  due_soon: 'text-lamp-amber',
}

function Telltale({ name, category, status, size = 'md' }) {
  const icon = iconFor(name, category)
  const color = lampColor[status] || 'text-lamp-off'
  const box = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'

  return (
    <span className={'inline-flex shrink-0 items-center justify-center bg-ink ' + box + ' ' + color} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
        <path d={icons[icon]} />
        {(circles[icon] || []).map(([cx, cy, r]) => (
          <circle key={cx + '-' + cy} cx={cx} cy={cy} r={r} />
        ))}
      </svg>
    </span>
  )
}

export default Telltale
