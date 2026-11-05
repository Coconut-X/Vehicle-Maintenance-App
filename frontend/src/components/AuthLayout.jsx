import NightDrive from './NightDrive'

const points = ['by km and by date, whichever comes first', 'odometer estimated between readings', 'emails 30, 7 and 1 day before']

//split screen for login and register, the brand panel with the night drive on the left and the form on the right
//on phones only the form shows
function AuthLayout({ children }) {
  return (
    <div className="grid min-h-[calc(100vh-7rem)] md:grid-cols-[1.1fr_1fr]">
      <aside className="hidden flex-col justify-between overflow-hidden bg-[#0e0e0d] text-white md:flex">
        <div className="px-10 pt-14 lg:px-14">
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent">car maintenance, tracked</p>
          <h2 className="mt-4 text-4xl font-bold uppercase leading-[0.95] lg:text-5xl">
            Every service.
            <br />
            <span className="text-accent">On time.</span>
          </h2>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-white/60">
                <span className="h-1.5 w-1.5 bg-accent" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <NightDrive className="mt-10" />
      </aside>

      <div className="flex items-center justify-center px-6 py-14">{children}</div>
    </div>
  )
}

export default AuthLayout
