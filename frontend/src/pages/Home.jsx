import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import StatusBadge from '../components/StatusBadge'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

//sample rows for the preview box, not real data
const sample = [
  { item: 'Engine oil change', basis: 'km', due: 'in 9 days', status: 'due_soon' },
  { item: 'Brake fluid', basis: 'time', due: 'in 214 days', status: 'up_to_date' },
  { item: 'Tyre rotation', basis: 'km', due: 'in 162 days', status: 'up_to_date' },
  { item: 'Battery replacement', basis: 'time', due: '47 days ago', status: 'overdue' },
]

const steps = [
  {
    no: '01',
    title: 'Add your vehicles',
    text: 'Enter the make, model and current odometer. Seventeen standard maintenance items are set up for you.',
  },
  {
    no: '02',
    title: 'Log what you get done',
    text: 'Save date, cost, workshop and the receipt. Each entry resets that item and sharpens the estimate.',
  },
  {
    no: '03',
    title: 'Get told in advance',
    text: 'One email 30, 7 and 1 day before anything falls due. You never have to remember to check.',
  },
]

function Home() {
  const token = useSelector((state) => state.auth.token)

  return (
    <div>
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 md:grid-cols-2 md:pt-24">
        <div className="flex flex-col justify-center">
          <p className={labelClass + ' !text-accent'}>vehicle maintenance, tracked</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
            Your car runs on two clocks. We watch both.
          </h1>
          <p className="mt-5 max-w-md text-muted">
            Engine oil is due at 5,000 km or six months, whichever comes first. CarVault tracks every job by
            distance and by date, predicts when it falls due, and emails you before it does.
          </p>
          <div className="mt-8 flex gap-3">
            {token ? (
              <Link to="/dashboard" className={btnPrimary}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className={btnPrimary}>
                  Start for free
                </Link>
                <Link to="/login" className={btnOutline}>
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-medium">Corolla</span>
            <span className="font-mono text-xs text-muted">LEA-1234 / 55,627 km</span>
          </div>
          <ul>
            {sample.map((row) => (
              <li
                key={row.item}
                className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm">{row.item}</p>
                  <p className="font-mono text-xs text-muted">
                    {row.due} / by {row.basis}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-px bg-line px-0 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.no} className="bg-card p-6 md:p-8">
              <p className="font-mono text-xs text-accent">{s.no}</p>
              <h2 className="mt-3 font-semibold tracking-tight">{s.title}</h2>
              <p className="mt-2 text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className={labelClass}>why not a spreadsheet</p>
        <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight md:text-3xl">
          Nobody types their odometer every day. So we estimate it.
        </h2>
        <p className="mt-4 max-w-xl text-muted">
          CarVault projects your current reading from your last one and your average monthly driving, so a
          kilometre-based job becomes a calendar date you can be reminded about. Every real reading you log
          corrects the estimate.
        </p>
      </section>
    </div>
  )
}

export default Home
