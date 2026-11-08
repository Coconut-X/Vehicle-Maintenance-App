import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api, { readError } from '../api'
import { parseEmails } from '../validate'
import { vehicleName } from '../format'
import ErrorNote from '../components/ErrorNote'
import Field from '../components/Field'
import Loading from '../components/Loading'
import Plate from '../components/Plate'
import TextArea from '../components/TextArea'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

//the groups of the user and a form to make a new one
function Groups() {
  const navigate = useNavigate()
  const me = useSelector((state) => state.auth.user)

  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const [name, setName] = useState('')
  const [emails, setEmails] = useState('')
  const [picked, setPicked] = useState([])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.get('/groups'), api.get('/vehicles', { params: { limit: 50 } })])
      .then(([g, v]) => {
        if (!cancelled) setResult({ groups: g.data.groups, vehicles: v.data.vehicles })
      })
      .catch((err) => {
        if (!cancelled) setError(readError(err).message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  //only your own cars that are not in a group can be put in a new one
  const free = result ? result.vehicles.filter((v) => !v.group && v.owner === me?._id) : []

  const toggle = (id) => setPicked(picked.includes(id) ? picked.filter((i) => i !== id) : [...picked, id])

  const handleCreate = async (e) => {
    e.preventDefault()
    const found = {}
    if (name.trim().length < 1 || name.trim().length > 60) found.name = 'Give the group a name of 1 to 60 characters.'
    const { valid, invalid } = parseEmails(emails)
    if (invalid.length) found.emails = 'These are not valid emails: ' + invalid.join(', ')
    else if (valid.length === 0) found.emails = 'Invite at least one person by email.'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      const res = await api.post('/groups', { name: name.trim(), emails: valid, vehicles: picked })
      const failed = res.data.invites.filter((i) => i.status === 'failed').map((i) => i.email)
      navigate('/groups/' + res.data.group._id, {
        state: {
          notice: 'Group made. Invitations sent to ' + (valid.length - failed.length) + ' of ' + valid.length + ' addresses.',
          warning: failed.length ? 'We could not send the email to ' + failed.join(', ') + '. Send it again from the invitations list.' : '',
        },
      })
    } catch (err) {
      const info = readError(err)
      setErrors(Object.keys(info.errors).length > 0 ? info.errors : { form: info.message })
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={labelClass}>family and groups</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Share cars.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Put the cars of a family or a team in one group. Everyone in it sees the same cars, logs services and gets the reminders.
          </p>
        </div>
        {!creating && result && (
          <button onClick={() => setCreating(true)} className={btnPrimary}>
            Make a group
          </button>
        )}
      </div>

      <div className="mt-6">
        <ErrorNote message={error} />
      </div>
      {!result && !error && <Loading />}

      {creating && result && (
        <form onSubmit={handleCreate} noValidate className="mt-8 border-2 border-ink bg-card">
          <div className="bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-accent">new group</div>
          <div className="space-y-5 p-5">
            {errors.form && <p className="text-sm text-bad">{errors.form}</p>}
            <Field label="Group name" id="groupName" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="The Qureshi family" />

            <div>
              <p className={labelClass}>cars to put in (optional)</p>
              {free.length === 0 ? (
                <p className="mt-2 border border-dashed border-line px-3 py-3 text-sm text-muted">
                  You have no cars outside a group yet. You can add cars to the group later.
                </p>
              ) : (
                <ul className="mt-2 grid gap-px border border-line bg-line sm:grid-cols-2">
                  {free.map((v) => (
                    <li key={v._id} className="bg-card">
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-paper">
                        <input type="checkbox" checked={picked.includes(v._id)} onChange={() => toggle(v._id)} className="h-4 w-4 shrink-0 accent-[#f26522]" />
                        <span className="min-w-0 flex-1 truncate">{vehicleName(v)}</span>
                        <Plate number={v.registrationNo} size="sm" />
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {errors.vehicles && <p className="mt-1 text-xs text-bad">{errors.vehicles}</p>}
            </div>

            <TextArea
              label="Invite by email"
              id="groupEmails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              error={errors.emails}
              placeholder={'sara@gmail.com\nahmed@mail.com'}
              hint="One on each line, or split by commas. Each person gets their own link that works once, for 7 days."
            />

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? 'Making the group...' : 'Make the group and send invitations'}
              </button>
              <button type="button" disabled={saving} onClick={() => setCreating(false)} className={btnOutline}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {result && result.groups.length === 0 && !creating && (
        <div className="mt-8 border border-dashed border-line bg-card p-8">
          <p className="font-medium">You are not in any group yet</p>
          <ul className="mt-3 max-w-lg list-disc space-y-1 pl-5 text-sm text-muted">
            <li>You make a group and become its admin, and invite people by email.</li>
            <li>Everyone who joins sees the group's cars and can log services and edit them.</li>
            <li>Only the admin adds or removes people. Anyone can leave.</li>
          </ul>
        </div>
      )}

      {result && result.groups.length > 0 && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {result.groups.map((g) => (
            <li key={g._id}>
              <Link to={'/groups/' + g._id} className="group block border border-line bg-card transition-colors hover:border-ink">
                <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                  <p className="min-w-0 truncate font-display text-lg font-bold [font-stretch:125%] group-hover:text-accent">{g.name}</p>
                  {g.isAdmin && <span className="shrink-0 border border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">admin</span>}
                </div>
                <div className="flex gap-8 px-4 py-3 font-mono text-xs text-muted">
                  <span>
                    <span className="text-lg text-ink">{g.memberCount}</span> {g.memberCount === 1 ? 'person' : 'people'}
                  </span>
                  <span>
                    <span className="text-lg text-ink">{g.vehicleCount}</span> {g.vehicleCount === 1 ? 'car' : 'cars'}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Groups
