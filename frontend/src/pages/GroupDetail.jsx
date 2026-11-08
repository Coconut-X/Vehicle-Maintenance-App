import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api, { readError } from '../api'
import { parseEmails } from '../validate'
import { formatDate, vehicleName } from '../format'
import ConfirmBox from '../components/ConfirmBox'
import ErrorNote from '../components/ErrorNote'
import Loading from '../components/Loading'
import Plate from '../components/Plate'
import TextArea from '../components/TextArea'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

//one numbered block of the page
function Block({ no, title, note, children }) {
  return (
    <section className="mt-8 border border-line bg-card">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line px-5 py-3">
        <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          <span className="bg-accent px-1.5 py-0.5 text-white">{no}</span>
          {title}
        </p>
        {note && <p className="text-xs text-muted">{note}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

const daysLeft = (date) => Math.max(0, Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24)))

//everything about one group, people, invitations, cars and the emails this person wants
function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const me = useSelector((state) => state.auth.user)

  //result remembers which group it is for, so loading is just a mismatch
  const [result, setResult] = useState(null)
  const [reload, setReload] = useState(0)
  const [error, setError] = useState('')

  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [renaming, setRenaming] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [emails, setEmails] = useState('')
  const [emailError, setEmailError] = useState('')
  const [inviteNote, setInviteNote] = useState([])
  const [saved, setSaved] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([api.get('/groups/' + id), api.get('/vehicles', { params: { limit: 50 } })])
      .then(([g, v]) => {
        if (cancelled) return
        setError('')
        setResult({ id, group: g.data.group, vehicles: v.data.vehicles })
      })
      .catch((err) => {
        if (!cancelled) setError(readError(err).message)
      })
    return () => {
      cancelled = true
    }
  }, [id, reload])

  const loading = !result || result.id !== id
  const group = result && !loading ? result.group : null
  //your own cars that are free to be added
  const myFree = result && !loading ? result.vehicles.filter((v) => !v.group && v.owner === me?._id) : []

  //runs one change, the answer holds the group as it is now
  const run = async (fn, after) => {
    setBusy(true)
    setActionError('')
    try {
      const res = await fn()
      if (res && res.data && res.data.group) setResult((r) => ({ ...r, group: res.data.group }))
      if (after) await after(res)
    } catch (err) {
      setActionError(readError(err).message)
    }
    setBusy(false)
  }

  const rename = (e) => {
    e.preventDefault()
    if (nameValue.trim().length < 1 || nameValue.trim().length > 60) {
      setActionError('The name must be 1 to 60 characters.')
      return
    }
    run(() => api.put('/groups/' + id, { name: nameValue.trim() }), () => setRenaming(false))
  }

  const invite = (e) => {
    e.preventDefault()
    const { valid, invalid } = parseEmails(emails)
    if (invalid.length) return setEmailError('These are not valid emails: ' + invalid.join(', '))
    if (valid.length === 0) return setEmailError('Enter at least one email.')
    setEmailError('')
    run(
      () => api.post('/groups/' + id + '/invites', { emails: valid }),
      (res) => {
        setInviteNote(res.data.invites)
        setEmails('')
      }
    )
  }

  const resend = (inviteId) =>
    run(
      () => api.post('/groups/' + id + '/invites/' + inviteId + '/resend'),
      (res) => setInviteNote(res.data.invites)
    )

  const setMode = (mode) => {
    const vehicles = mode === 'custom' ? group.notify.vehicles : []
    run(() => api.put('/groups/' + id + '/notify', { mode, vehicles }), () => setSaved('Saved.'))
  }

  const toggleCar = (carId) => {
    const current = group.notify.vehicles
    const vehicles = current.includes(carId) ? current.filter((c) => c !== carId) : [...current, carId]
    run(() => api.put('/groups/' + id + '/notify', { mode: 'custom', vehicles }), () => setSaved('Saved.'))
  }

  const doConfirm = () => {
    if (confirm.type === 'leave') {
      return run(() => api.post('/groups/' + id + '/leave'), (res) => navigate('/groups', { state: { notice: res.data.message } }))
    }
    if (confirm.type === 'delete') {
      return run(() => api.delete('/groups/' + id), (res) => navigate('/groups', { state: { notice: res.data.message } }))
    }
    if (confirm.type === 'kick') {
      return run(() => api.delete('/groups/' + id + '/members/' + confirm.userId), () => setConfirm(null))
    }
    if (confirm.type === 'revoke') {
      return run(
        () => api.delete('/groups/' + id + '/invites/' + confirm.inviteId),
        () => {
          setInviteNote([])
          setConfirm(null)
        }
      )
    }
  }

  const notice = location.state?.notice
  const warning = location.state?.warning

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link to="/groups" className="font-mono text-xs uppercase tracking-widest text-muted hover:text-ink">
        &larr; family and groups
      </Link>

      {loading && !error && <Loading />}
      {error && (
        <div className="mt-6">
          <ErrorNote message={error} />
          <Link to="/groups" className={btnOutline + ' mt-4'}>
            Back to your groups
          </Link>
        </div>
      )}

      {group && (
        <>
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {renaming ? (
                <form onSubmit={rename} className="flex flex-wrap items-center gap-2">
                  <input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    aria-label="Group name"
                    className="border border-ink bg-card px-3 py-2 font-display text-xl font-bold focus:outline-none"
                  />
                  <button type="submit" disabled={busy} className={btnPrimary + ' !py-2'}>
                    Save
                  </button>
                  <button type="button" onClick={() => setRenaming(false)} className={btnOutline + ' !py-2'}>
                    Cancel
                  </button>
                </form>
              ) : (
                <h1 className="truncate text-3xl font-semibold tracking-tight">{group.name}</h1>
              )}
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted">
                {group.memberCount} {group.memberCount === 1 ? 'person' : 'people'} / {group.vehicleCount} {group.vehicleCount === 1 ? 'car' : 'cars'}
                {group.isAdmin ? ' / you are the admin' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {group.isAdmin && !renaming && (
                <button
                  onClick={() => {
                    setNameValue(group.name)
                    setRenaming(true)
                  }}
                  className={btnOutline}
                >
                  Rename
                </button>
              )}
              <button onClick={() => setConfirm({ type: 'leave' })} className={btnOutline}>
                Leave group
              </button>
              {group.isAdmin && (
                <button onClick={() => setConfirm({ type: 'delete' })} className={btnOutline + ' hover:!border-bad hover:!bg-bad'}>
                  Delete group
                </button>
              )}
            </div>
          </div>

          {notice && (
            <p role="status" className="mt-6 border border-good bg-card px-3 py-2 text-sm text-good">
              {notice}
            </p>
          )}
          {warning && (
            <p role="status" className="mt-4 border border-warn bg-card px-3 py-2 text-sm text-warn">
              {warning}
            </p>
          )}
          {actionError && (
            <p role="alert" className="mt-4 border border-bad bg-card px-3 py-2 text-sm text-bad">
              {actionError}
            </p>
          )}

          {confirm && (confirm.type === 'leave' || confirm.type === 'delete') && (
            <div className="mt-6">
              <ConfirmBox
                title={confirm.type === 'leave' ? 'Leave ' + group.name + '?' : 'Delete ' + group.name + '?'}
                text={
                  confirm.type === 'leave'
                    ? 'You stop seeing the group cars. Cars of yours that are in the group move to the admin so the family keeps them. ' +
                      (group.isAdmin ? 'The person who joined first becomes the admin.' : '')
                    : 'The group goes away and its cars go back to the people who added them. Nothing is deleted.'
                }
                confirmLabel={confirm.type === 'leave' ? 'Leave group' : 'Delete group'}
                busy={busy}
                error=""
                onConfirm={doConfirm}
                onCancel={() => setConfirm(null)}
              />
            </div>
          )}

          <Block no="01" title="people" note={group.isAdmin ? 'You add and remove people.' : 'Only the admin adds or removes people.'}>
            <ul className="divide-y divide-line border border-line">
              {group.members.map((m) => (
                <li key={m.user} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.name} {m.user === me?._id && <span className="font-mono text-xs font-normal text-muted">(you)</span>}
                    </p>
                    <p className="truncate font-mono text-xs text-muted">
                      {m.email} / joined {formatDate(m.joinedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {m.isAdmin && <span className="border border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">admin</span>}
                    {group.isAdmin && !m.isAdmin && (
                      <button onClick={() => setConfirm({ type: 'kick', userId: m.user, name: m.name })} className="text-xs underline underline-offset-4 hover:text-bad">
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {confirm && confirm.type === 'kick' && (
              <div className="mt-4">
                <ConfirmBox
                  title={'Remove ' + confirm.name + '?'}
                  text="They stop seeing the group cars. Cars of theirs that are in the group move to you, so the family keeps them."
                  confirmLabel="Remove"
                  busy={busy}
                  error=""
                  onConfirm={doConfirm}
                  onCancel={() => setConfirm(null)}
                />
              </div>
            )}
          </Block>

          {group.isAdmin && (
            <Block no="02" title="invitations" note="One link for each person, it works once and only for that email.">
              <form onSubmit={invite} noValidate>
                <TextArea
                  label="Invite more people"
                  id="inviteEmails"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  error={emailError}
                  placeholder="email addresses, one on each line"
                  rows={2}
                />
                <button type="submit" disabled={busy} className={btnPrimary + ' mt-3'}>
                  Send invitations
                </button>
              </form>

              {inviteNote.length > 0 && (
                <ul className="mt-4 space-y-1 font-mono text-xs">
                  {inviteNote.map((n) => (
                    <li key={n.email} className={n.status === 'sent' ? 'text-good' : n.status === 'failed' ? 'text-bad' : 'text-muted'}>
                      {n.email}: {n.status}
                    </li>
                  ))}
                </ul>
              )}

              {group.invites && group.invites.length > 0 && (
                <ul className="mt-5 divide-y divide-line border border-line">
                  {group.invites.map((i) => (
                    <li key={i._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{i.email}</p>
                        <p className={'font-mono text-xs ' + (i.expired ? 'text-bad' : 'text-muted')}>
                          {i.expired ? 'expired' : 'waiting, ' + daysLeft(i.expiresAt) + ' days left'}
                        </p>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <button onClick={() => resend(i._id)} disabled={busy} className="underline underline-offset-4 hover:text-accent">
                          Send again
                        </button>
                        <button onClick={() => setConfirm({ type: 'revoke', inviteId: i._id, email: i.email })} className="underline underline-offset-4 hover:text-bad">
                          Cancel
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {confirm && confirm.type === 'revoke' && (
                <div className="mt-4">
                  <ConfirmBox
                    title={'Cancel the invitation to ' + confirm.email + '?'}
                    text="The link in their email stops working. You can invite them again later."
                    confirmLabel="Cancel invitation"
                    busy={busy}
                    error=""
                    onConfirm={doConfirm}
                    onCancel={() => setConfirm(null)}
                  />
                </div>
              )}
            </Block>
          )}

          <Block no={group.isAdmin ? '03' : '02'} title="cars" note="Everyone in the group can log services and edit these.">
            {group.vehicles.length === 0 ? (
              <div className="border border-dashed border-line px-5 py-8 text-center">
                <p className="font-medium">No cars added yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Add a new car to this group, or put one of your own cars in it.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line border border-line">
                {group.vehicles.map((v) => (
                  <li key={v._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Plate number={v.registrationNo} size="sm" />
                      <Link to={'/vehicles/' + v._id} className="truncate text-sm font-medium underline-offset-4 hover:text-accent hover:underline">
                        {vehicleName(v)}
                      </Link>
                    </div>
                    <button
                      onClick={() => run(() => api.put('/groups/' + id + '/vehicles', { remove: [v._id] }), () => setReload((r) => r + 1))}
                      disabled={busy}
                      className="text-xs underline underline-offset-4 hover:text-bad"
                    >
                      Take out of the group
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link to={'/vehicles/new?group=' + id} className={btnPrimary}>
                Add a new car
              </Link>
            </div>

            {myFree.length > 0 && (
              <div className="mt-6">
                <p className={labelClass}>or put one of your cars in</p>
                <ul className="mt-2 divide-y divide-line border border-line">
                  {myFree.map((v) => (
                    <li key={v._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                      <span className="flex min-w-0 items-center gap-3">
                        <Plate number={v.registrationNo} size="sm" />
                        <span className="truncate text-sm">{vehicleName(v)}</span>
                      </span>
                      <button
                        onClick={() => run(() => api.put('/groups/' + id + '/vehicles', { add: [v._id] }), () => setReload((r) => r + 1))}
                        disabled={busy}
                        className="text-xs underline underline-offset-4 hover:text-accent"
                      >
                        Add to the group
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Block>

          <Block no={group.isAdmin ? '04' : '03'} title="my reminder emails" note="Only for you. Everyone chooses their own.">
            <div className="grid gap-px border border-ink bg-ink sm:max-w-xl sm:grid-cols-3">
              {[
                { value: 'all', label: 'All reminders' },
                { value: 'custom', label: 'Only some cars' },
                { value: 'off', label: 'None' },
              ].map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={group.notify.mode === m.value}
                  onClick={() => setMode(m.value)}
                  disabled={busy}
                  className={'px-3 py-2 text-sm transition-colors ' + (group.notify.mode === m.value ? 'bg-ink text-white' : 'bg-card hover:bg-paper')}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {group.notify.mode === 'all' && 'You get an email for every car of this group when something is coming up.'}
              {group.notify.mode === 'off' && 'No emails about this group. You still see everything in the app.'}
              {group.notify.mode === 'custom' && 'You only get emails for the cars ticked below.'}
            </p>

            {group.notify.mode === 'custom' && (
              <ul className="mt-3 divide-y divide-line border border-line sm:max-w-xl">
                {group.vehicles.length === 0 && <li className="px-4 py-3 text-sm text-muted">No cars in this group yet.</li>}
                {group.vehicles.map((v) => (
                  <li key={v._id}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-paper">
                      <input type="checkbox" checked={group.notify.vehicles.includes(v._id)} onChange={() => toggleCar(v._id)} disabled={busy} className="h-4 w-4 accent-[#f26522]" />
                      <span className="min-w-0 flex-1 truncate">{vehicleName(v)}</span>
                      <Plate number={v.registrationNo} size="sm" />
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {saved && <p aria-live="polite" className="mt-2 font-mono text-[11px] uppercase tracking-widest text-good">{saved}</p>}
            <p className="mt-3 text-xs text-muted">Your own cars that are not in a group follow the reminder switch in your profile. Turning that off silences everything.</p>
          </Block>
        </>
      )}
    </div>
  )
}

export default GroupDetail
