import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import api, { readError } from '../api'
import { logout, setUser } from '../store/authSlice'
import ErrorNote from '../components/ErrorNote'
import Field from '../components/Field'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

//same rules as the backend
const checkDetails = (form) => {
  const errors = {}
  const name = form.name.trim()
  if (name.length < 2 || name.length > 60) errors.name = 'Name must be 2 to 60 characters.'
  if (form.defaultMonthlyKm !== '') {
    const km = Number(form.defaultMonthlyKm)
    if (!Number.isInteger(km) || km < 0 || km > 20000) errors.defaultMonthlyKm = 'Enter a whole number from 0 to 20000.'
  }
  return errors
}

const checkPassword = (form) => {
  const errors = {}
  if (!form.currentPassword) errors.currentPassword = 'Enter your current password.'
  const p = form.newPassword
  if (p.length < 8 || !/[a-zA-Z]/.test(p) || !/[0-9]/.test(p)) {
    errors.newPassword = 'Use at least 8 characters with a letter and a number.'
  }
  if (form.confirm !== p) errors.confirm = 'Passwords do not match.'
  return errors
}

function Section({ title, text, children }) {
  return (
    <section className="grid gap-4 border-t border-line py-8 md:grid-cols-3 md:gap-8">
      <div>
        <h2 className="font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
      <div className="md:col-span-2">{children}</div>
    </section>
  )
}

function DetailsForm({ user }) {
  const dispatch = useDispatch()
  const [form, setForm] = useState({
    name: user.name || '',
    defaultMonthlyKm: user.defaultMonthlyKm == null ? '' : String(user.defaultMonthlyKm),
    remindersEnabled: user.remindersEnabled !== false,
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const change = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
    setSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = checkDetails(form)
    setErrors(found)
    setMessage('')
    if (Object.keys(found).length > 0) return

    setBusy(true)
    try {
      const res = await api.put('/users/me', {
        name: form.name.trim(),
        defaultMonthlyKm: form.defaultMonthlyKm,
        remindersEnabled: form.remindersEnabled,
      })
      dispatch(setUser(res.data.user))
      setSaved(true)
    } catch (err) {
      const info = readError(err)
      setMessage(info.message)
      setErrors(info.errors)
    }
    setBusy(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-md space-y-4">
      <ErrorNote message={message} />
      <Field label="name" id="name" name="name" value={form.name} onChange={change} error={errors.name} />
      <div>
        <p className={labelClass}>email</p>
        <p className="mt-1.5 border border-line bg-paper px-3 py-2 font-mono text-sm text-muted">{user.email}</p>
      </div>
      <Field
        label="default km per month"
        id="defaultMonthlyKm"
        name="defaultMonthlyKm"
        inputMode="numeric"
        value={form.defaultMonthlyKm}
        onChange={change}
        error={errors.defaultMonthlyKm}
        hint="Your usual km per month. Leave empty to remove it."
      />
      <label className="flex items-start gap-3 border border-line bg-card px-3 py-3">
        <input
          type="checkbox"
          name="remindersEnabled"
          checked={form.remindersEnabled}
          onChange={change}
          className="mt-0.5 h-4 w-4 accent-[#f26522]"
        />
        <span>
          <span className="block text-sm font-medium">Email reminders {form.remindersEnabled ? 'on' : 'off'}</span>
          <span className="block text-xs text-muted">One email a day at most, 30, 7 and 1 day before an item is due and when it is overdue.</span>
        </span>
      </label>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Saving...' : 'Save details'}
        </button>
        {saved && <p role="status" className="font-mono text-xs uppercase tracking-widest text-good">saved</p>}
      </div>
    </form>
  )
}

function PasswordForm() {
  const empty = { currentPassword: '', newPassword: '', confirm: '' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = checkPassword(form)
    setErrors(found)
    setMessage('')
    if (Object.keys(found).length > 0) return

    setBusy(true)
    try {
      await api.put('/users/me/password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      setForm(empty)
      setSaved(true)
    } catch (err) {
      const info = readError(err)
      setMessage(info.message)
      setErrors(info.errors)
    }
    setBusy(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-md space-y-4">
      <ErrorNote message={message} />
      <Field
        label="current password"
        id="currentPassword"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={change}
        error={errors.currentPassword}
      />
      <Field
        label="new password"
        id="newPassword"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        value={form.newPassword}
        onChange={change}
        error={errors.newPassword}
        hint="At least 8 characters with a letter and a number."
      />
      <Field
        label="repeat new password"
        id="confirm"
        name="confirm"
        type="password"
        autoComplete="new-password"
        value={form.confirm}
        onChange={change}
        error={errors.confirm}
      />
      <div className="flex items-center gap-4">
        <button type="submit" disabled={busy} className={btnOutline}>
          {busy ? 'Changing...' : 'Change password'}
        </button>
        {saved && <p role="status" className="font-mono text-xs uppercase tracking-widest text-good">password changed</p>}
      </div>
    </form>
  )
}

function DeleteAccount() {
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleDelete = async (e) => {
    e.preventDefault()
    if (!password) {
      setError('Enter your password to confirm.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api.delete('/users/me', { data: { password } })
      //the protected route sends the logged out user to the login page
      dispatch(logout())
    } catch (err) {
      const info = readError(err)
      setError(info.errors.password ? 'That password is wrong.' : info.message)
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center border border-bad px-4 py-2 text-sm font-medium text-bad transition-colors hover:bg-bad hover:text-white"
      >
        Delete account
      </button>
    )
  }

  return (
    <form onSubmit={handleDelete} noValidate role="alertdialog" aria-labelledby="delete-title" className="max-w-md border border-bad bg-card p-5">
      <p id="delete-title" className="font-medium">
        Delete your account?
      </p>
      <p className="mt-1 text-sm text-muted">
        All your vehicles, schedules, service history and receipts are removed for good. This cannot be undone.
      </p>
      <div className="mt-4">
        <Field
          label="password"
          id="deletePassword"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center bg-bad px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Deleting...' : 'Delete everything'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false)
            setPassword('')
            setError('')
          }}
          className={btnOutline}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function Profile() {
  const user = useSelector((state) => state.auth.user)

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className={labelClass}>profile</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your account.</h1>

      <div className="mt-8">
        <Section title="Details" text="Your name, usage default and reminder emails.">
          {user && <DetailsForm key={user._id} user={user} />}
        </Section>
        <Section title="Password" text="You stay logged in after changing it.">
          <PasswordForm />
        </Section>
        <Section title="Danger zone" text="Remove your account and all its data.">
          <DeleteAccount />
        </Section>
      </div>
    </div>
  )
}

export default Profile
