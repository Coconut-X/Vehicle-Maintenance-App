import { useState } from 'react'
import { Link } from 'react-router-dom'
import PartGauge from './PartGauge'
import SegmentBar from './SegmentBar'
import { buildSystems, rank, usedPart, xrays } from '../wear'
import { daysText, kmLeftText } from '../format'

const dotColour = {
  overdue: 'bg-lamp-red',
  due_soon: 'bg-lamp-amber',
  up_to_date: 'bg-lamp-green',
  unknown: 'bg-lamp-off',
}

const statusText = {
  overdue: { label: 'Overdue', cls: 'text-lamp-red', head: 'Needs work now' },
  due_soon: { label: 'Due soon', cls: 'text-lamp-amber', head: 'Due soon' },
  up_to_date: { label: 'Up to date', cls: 'text-lamp-green', head: 'All good' },
  unknown: { label: 'Needs data', cls: 'text-white/50', head: 'Needs data' },
}

const itemDueText = (entry) => {
  const d = entry.due
  if (!d || !d.dueDate) return 'no due date yet'
  if (d.basis === 'distance' && d.remainingKm !== null) return kmLeftText(d.remainingKm)
  return daysText(d.remainingDays)
}

//the hotspot on the picture, a lamp that pings when the system needs work
function Hotspot({ system, active, onPick }) {
  const due = system.status === 'overdue' || system.status === 'due_soon'
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      aria-label={system.label + ', ' + statusText[system.status].label}
      style={{ left: system.x + '%', top: system.y + '%' }}
      className={
        'absolute flex -translate-y-1/2 items-center gap-2 ' +
        (system.left ? '-translate-x-[calc(100%-0.5rem)] flex-row-reverse' : '-translate-x-2')
      }
    >
      <span className="relative flex h-4 w-4 items-center justify-center">
        {due && <span className={'absolute inset-0 animate-ping opacity-70 ' + dotColour[system.status]} />}
        <span className={'relative h-2.5 w-2.5 ' + dotColour[system.status] + (active ? ' outline-2 outline-offset-2 outline-white' : '')} />
      </span>
      <span
        className={
          'hidden border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest sm:inline ' +
          (active ? 'border-white bg-white text-ink' : 'border-white/20 bg-black/70 text-white/80 hover:border-white/60')
        }
      >
        {system.tag || system.label}
      </span>
    </button>
  )
}

//xray of the car where every system lights up by its status, pick one to see its parts
function HealthMap({ entries, vehicleId, powertrain }) {
  const systems = buildSystems(entries, powertrain)
  const xray = xrays[powertrain] || xrays.petrol
  const [picked, setPicked] = useState(null)

  if (systems.length === 0) return null

  //start on the worst system so the problem shows first
  const worst = [...systems].sort((a, b) => rank[a.status] - rank[b.status])[0]
  const current = systems.find((s) => s.key === picked) || worst
  const needWork = systems.filter((s) => s.status === 'overdue' || s.status === 'due_soon').length
  const info = statusText[current.status]

  return (
    <section className="mt-10 border border-ink bg-[#0a0a0a] text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">system check</p>
        <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">
          {needWork === 0 ? 'all systems ok' : needWork + ' of ' + systems.length + ' systems need work'}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1.7fr_1fr]">
        <div className="min-w-0 border-b border-white/10 lg:border-r lg:border-b-0">
          <div className="relative overflow-hidden">
            <img src={xray.src} alt={xray.alt} className="block w-full" width="1200" height="597" />
            {/*scanner line sweeping over the car like a diagnostic machine*/}
            <span className="xray-scan pointer-events-none absolute inset-y-0 w-24" aria-hidden="true" />
            {systems.map((s) => (
              <Hotspot key={s.key} system={s} active={s.key === current.key} onPick={() => setPicked(s.key)} />
            ))}
          </div>

          <div className="grid grid-cols-3 border-t border-white/10 sm:grid-cols-6">
            {systems.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setPicked(s.key)}
                aria-pressed={s.key === current.key}
                className={
                  'flex flex-col items-center gap-1 border-white/10 px-2 py-3 not-last:border-r ' +
                  (s.key === current.key ? 'bg-white/10' : 'hover:bg-white/5')
                }
              >
                <PartGauge kind={s.key} used={s.used} status={s.status} electric={powertrain !== undefined && powertrain !== 'petrol'} className="h-10 w-10" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/70">{s.label}</span>
                <span className={'font-mono text-[10px] uppercase ' + statusText[s.status].cls}>{statusText[s.status].label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-4">
            <PartGauge kind={current.key} used={current.used} status={current.status} electric={powertrain !== undefined && powertrain !== 'petrol'} className="h-24 w-24 shrink-0" />
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">{current.tag || current.label}</p>
              <h2 className={'mt-1 text-2xl font-bold uppercase leading-none ' + info.cls}>{info.head}</h2>
              <p className="mt-2 font-mono text-xs text-white/50">{Math.round(current.used * 100)}% worn</p>
            </div>
          </div>

          <ul className="mt-5 border-t border-white/10">
            {current.items.map((entry) => {
              const used = usedPart(entry)
              return (
                <li key={entry._id} className="border-b border-white/10 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm">{entry.item.name}</p>
                      <p className="font-mono text-xs text-white/50">{itemDueText(entry)}</p>
                    </div>
                    <span className={'shrink-0 font-mono text-[11px] uppercase ' + statusText[entry.status].cls}>
                      {statusText[entry.status].label}
                    </span>
                  </div>
                  {used !== null && (
                    <div className="mt-2">
                      <SegmentBar part={used} status={entry.status} track="bg-white/10" />
                    </div>
                  )}
                  <Link
                    to={'/vehicles/' + vehicleId + '/log?item=' + entry.item._id}
                    className="mt-2 inline-block font-mono text-[11px] uppercase tracking-widest text-white/60 underline underline-offset-4 hover:text-accent"
                  >
                    Log service
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default HealthMap
