import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import CarScene from '../components/CarScene'
import CarArt from '../components/CarArt'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

const facts = [
  { value: '19', label: 'service items' },
  { value: '2', label: 'clocks per item' },
  { value: '30/7/1', label: 'days notice' },
  { value: '4', label: 'powertrains' },
]

//real sequence, so the numbers mean something
const steps = [
  {
    no: '01',
    title: 'Park it in your garage',
    text: 'Make, model, odometer and how far you drive a month. Pick petrol, hybrid, plug-in or electric and the right service items are set up for that car.',
  },
  {
    no: '02',
    title: 'Log every job',
    text: 'Date, km, workshop, cost and the receipt photo. Logging a job resets that item and teaches CarVault how much you really drive.',
  },
  {
    no: '03',
    title: 'Get told before it is due',
    text: 'A daily check emails you 30, 7 and 1 day before anything falls due, and once more if it goes overdue. One email, never the same reminder twice.',
  },
]

const powertrainCards = [
  { name: 'Petrol', value: 'petrol', items: 18, note: 'Oil, filters, spark plugs, timing belt, brakes, tyres and the rest.' },
  { name: 'Hybrid', value: 'hybrid', items: 19, note: 'Everything a petrol car needs, plus a yearly high voltage battery check.' },
  { name: 'Plug-in hybrid', value: 'phev', items: 19, note: 'Same as a hybrid. The engine still needs oil even if you mostly charge.' },
  { name: 'Electric', value: 'electric', items: 13, note: 'No oil, no spark plugs, no timing belt. Brakes, tyres, coolant and the battery stay.' },
]

const reminderStops = [
  { when: '30 days', text: 'Book a slot', tone: 'border-warn text-warn' },
  { when: '7 days', text: 'Get it done this week', tone: 'border-warn text-warn' },
  { when: '1 day', text: 'Due tomorrow', tone: 'border-warn text-warn' },
  { when: 'Overdue', text: 'Last call', tone: 'border-bad text-bad' },
]

//small dial like the ones on a dashboard, the needle sweeps once when it scrolls into view
function Gauge({ label, value, unit, sweep }) {
  return (
    <div className="bg-card p-5">
      <svg viewBox="0 0 120 72" className="mx-auto block w-40 text-ink" aria-hidden="true">
        <path d="M10 64 A50 50 0 0 1 110 64" fill="none" className="stroke-line" strokeWidth="8" />
        <path d="M10 64 A50 50 0 0 1 110 64" fill="none" className="gauge-arc stroke-accent" strokeWidth="8" pathLength="100" strokeDasharray={sweep + ' 100'} />
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1="60" y1="18" x2="60" y2="24" className="stroke-muted" strokeWidth="1.5" transform={'rotate(' + (i * 45 - 90) + ' 60 64)'} />
        ))}
        <g className="gauge-needle" style={{ '--needle': sweep * 1.8 - 90 + 'deg' }}>
          <line x1="60" y1="64" x2="60" y2="22" className="stroke-ink" strokeWidth="2.5" />
        </g>
        <circle cx="60" cy="64" r="5" className="fill-ink" />
      </svg>
      <p className={labelClass + ' mt-3 text-center'}>{label}</p>
      <p className="text-center font-mono text-xl tabular-nums">
        {value} <span className="text-sm text-muted">{unit}</span>
      </p>
    </div>
  )
}

//fades sections in when they scroll into view
//only things below the first screen get hidden, so the page is never blank without js
const useReveal = (ref) => {
  useEffect(() => {
    const root = ref.current
    if (!root || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const items = Array.from(root.querySelectorAll('[data-reveal]'))
    const below = items.filter((el) => el.getBoundingClientRect().top > window.innerHeight)
    below.forEach((el) => el.classList.add('reveal-wait'))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('reveal-wait')
            entry.target.classList.add('reveal-in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    below.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [ref])
}

const heroPrimary =
  'inline-flex items-center justify-center bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-white'
const heroOutline =
  'inline-flex items-center justify-center border border-white/40 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white hover:text-ink'

function Home() {
  const token = useSelector((state) => state.auth.token)
  const pageRef = useRef(null)
  useReveal(pageRef)

  const actions = token ? (
    <Link to="/dashboard" className={btnPrimary}>
      Open dashboard
    </Link>
  ) : (
    <>
      <Link to="/register" className={btnPrimary}>
        Add your first car
      </Link>
      <Link to="/login" className={btnOutline}>
        Log in
      </Link>
    </>
  )

  //the hero is dark so its buttons are orange and white
  const heroActions = token ? (
    <Link to="/dashboard" className={heroPrimary}>
      Open dashboard
    </Link>
  ) : (
    <>
      <Link to="/register" className={heroPrimary}>
        Add your first car
      </Link>
      <Link to="/login" className={heroOutline}>
        Log in
      </Link>
    </>
  )

  return (
    <div ref={pageRef} className="overflow-x-hidden">
      {/*hero, dark like a car brand site at night*/}
      <section className="bg-[#0e0e0d] text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-14 md:grid-cols-[1.15fr_1fr] md:pb-20 md:pt-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-accent">car maintenance, tracked by km and by date</p>
            <h1 className="mt-5 text-4xl font-bold uppercase leading-[0.95] md:text-5xl lg:text-[3.5rem]">
              Your car runs on two clocks. <span className="text-accent">We watch both.</span>
            </h1>
            <p className="mt-6 max-w-md text-white/60">
              Engine oil is due at 5,000 km or six months, whichever comes first. CarVault tracks every service item by
              kilometre and by date, works out today&apos;s odometer for you, and emails you before anything falls due.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">{heroActions}</div>
          </div>
          <CarScene />
        </div>
      </section>

      {/*facts strip*/}
      <section className="border-b border-line border-t border-t-white/10 bg-ink text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
          {facts.map((f, i) => (
            <div key={f.label} data-reveal className={'px-6 py-6 ' + (i % 2 === 1 ? 'border-l border-white/15 ' : '') + (i === 2 ? 'border-t border-white/15 md:border-l md:border-t-0' : i === 3 ? 'border-t border-white/15 md:border-t-0' : '')}>
              <p className="whitespace-nowrap font-mono text-2xl tabular-nums text-accent md:text-3xl">{f.value}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-white/60">{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/*two clocks*/}
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
        <div data-reveal>
          <p className={labelClass}>the two clocks</p>
          <h2 className="mt-3 max-w-md text-2xl font-semibold tracking-tight md:text-3xl">
            Kilometres or months. Whichever runs out first wins.
          </h2>
          <p className="mt-4 max-w-md text-muted">
            Brake pads wear with driving. Brake fluid and batteries age with time. Oil does both. For every item CarVault
            keeps a km clock and a calendar clock, and the one that reaches its limit first sets the due date.
          </p>
          <p className="mt-4 max-w-md text-muted">
            Nobody types in their odometer every day, so we estimate it from your last reading and how much you drive.
            Every service you log corrects the estimate.
          </p>
        </div>
        <div data-reveal className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
          <Gauge label="since last oil change" value="4,620" unit="/ 5,000 km" sweep={92} />
          <Gauge label="since last oil change" value="3.5" unit="/ 6 months" sweep={58} />
          <div className="bg-card px-5 py-4 sm:col-span-2">
            <p className="font-mono text-xs text-muted">km clock wins</p>
            <p className="text-sm">
              Oil change due in about <span className="font-mono">380 km</span>, roughly{' '}
              <span className="font-mono">10 days</span> at your pace.
            </p>
          </div>
        </div>
      </section>

      {/*how it works*/}
      <section className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-6 pt-16">
          <p className={labelClass} data-reveal>
            how it works
          </p>
        </div>
        <div className="mx-auto grid max-w-6xl gap-px px-6 pb-16 pt-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.no} data-reveal className="border-t-2 border-ink pt-5 md:pr-8">
              <p className="font-mono text-xs text-accent">{s.no}</p>
              <h3 className="mt-3 font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/*powertrains*/}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div data-reveal>
          <p className={labelClass}>petrol to electric</p>
          <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight md:text-3xl">
            The schedule fits the car you actually drive.
          </h2>
          <p className="mt-4 max-w-xl text-muted">
            An electric car has no oil to change. A hybrid still does, plus a battery to look after. Pick the powertrain
            when you add the car and only the items it needs show up. Every interval can still be changed per car.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {powertrainCards.map((p) => (
            <div key={p.value} data-reveal className="bg-card">
              <div className="aspect-[16/8] border-b border-line">
                <CarArt powertrain={p.value} />
              </div>
              <div className="p-5">
                <p className="font-medium">{p.name}</p>
                <p className="mt-4 font-mono text-3xl tabular-nums">{p.items}</p>
                <p className={labelClass}>service items</p>
                <p className="mt-3 text-sm text-muted">{p.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/*reminders road*/}
      <section className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div data-reveal>
            <p className={labelClass}>reminders</p>
            <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight md:text-3xl">Four stops before a missed service.</h2>
          </div>
          <div data-reveal className="relative mt-10">
            {/*the road line behind the stops*/}
            <div className="absolute left-0 right-0 top-[11px] hidden h-[3px] bg-ink md:block" />
            <div className="absolute left-0 right-0 top-[12px] hidden border-t border-dashed border-paper md:block" />
            <ol className="relative grid gap-6 md:grid-cols-4">
              {reminderStops.map((r) => (
                <li key={r.when} className="flex gap-4 md:block">
                  <span className={'relative z-[1] mt-0.5 block h-6 w-6 shrink-0 border-2 bg-card ' + r.tone} />
                  <div className="md:mt-4">
                    <p className={'font-mono text-sm uppercase tracking-wide ' + r.tone.split(' ')[1]}>{r.when}</p>
                    <p className="text-sm text-muted">{r.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <p data-reveal className="mt-10 max-w-xl text-sm text-muted">
            All due items for all your cars arrive together in one email. If a send fails it is tried again the next day,
            and once a reminder has gone out it never repeats.
          </p>
        </div>
      </section>

      {/*closing band*/}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div data-reveal className="flex flex-col items-start justify-between gap-6 border border-ink p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Keep the receipts. Lose the guesswork.</h2>
            <p className="mt-2 max-w-lg text-sm text-muted">
              Your full service history, with receipt photos, ready when you sell the car.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">{actions}</div>
        </div>
      </section>
    </div>
  )
}

export default Home
