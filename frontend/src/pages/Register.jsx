import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api, { readError } from '../api'
import { validateRegister } from '../validate'
import Field from '../components/Field'
import AuthLayout from '../components/AuthLayout'
import useCooldown from '../useCooldown'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', defaultMonthlyKm: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  //set after signing up, the page then asks the user to open the link we emailed
  const [sent, setSent] = useState(null)
  const [resendNote, setResendNote] = useState('')
  const [left, startCooldown] = useCooldown(60)

  const token = useSelector((state) => state.auth.token)
  const navigate = useNavigate()

  //the link is usually opened in another tab, that tab tells this one through localStorage
  useEffect(() => {
    if (!sent) return
    const onStorage = (e) => {
      if (e.key !== 'carvault_verified' || !e.newValue) return
      try {
        if (JSON.parse(e.newValue).email !== sent.email) return
      } catch {
        return
      }
      navigate('/login', { state: { notice: 'Email verified. Log in to start.', email: sent.email } })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [sent, navigate])

  //already logged in
  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const found = validateRegister(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const body = { name: form.name.trim(), email: form.email.trim(), password: form.password }
    if (form.defaultMonthlyKm !== '') body.defaultMonthlyKm = Number(form.defaultMonthlyKm)

    setLoading(true)
    try {
      const res = await api.post('/auth/register', body)
      setSent({ email: res.data.email, emailSent: res.data.emailSent })
      setLoading(false)
      //the server also waits a minute before sending another
      startCooldown()
    } catch (err) {
      //server field errors like email already registered show under the field
      const { message, errors: fieldErrors } = readError(err)
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : message)
      setLoading(false)
    }
  }

  const resend = async () => {
    setResendNote('')
    startCooldown()
    try {
      await api.post('/auth/resend-verification', { email: sent.email })
      setResendNote('A new link is on its way.')
    } catch (err) {
      setResendNote(readError(err).message)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="w-full max-w-sm">
          <p className={labelClass + ' !text-accent'}>almost there</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {sent.emailSent ? 'Check your email.' : 'Email not sent.'}
          </h1>
          {sent.emailSent ? (
            <p className="mt-2 text-sm text-muted">
              We sent a link to <span className="font-medium text-ink">{sent.email}</span>. Open it to switch your account on.
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Your account for <span className="font-medium text-ink">{sent.email}</span> is saved, but we could not send the link just now.
              Press the button below to try again.
            </p>
          )}

          <p
            role="status"
            className="mt-6 flex items-center gap-2 border border-line bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-muted"
          >
            <span className={'h-2 w-2 ' + (sent.emailSent ? 'lamp-blink bg-lamp-amber' : 'bg-lamp-red')} aria-hidden="true" />
            {sent.emailSent ? 'waiting for you to open the link' : 'link not sent'}
          </p>

          <button onClick={resend} disabled={left > 0} className={btnOutline + ' mt-4 w-full'}>
            {left > 0 ? 'Send again in ' + left + 's' : sent.emailSent ? 'Send the link again' : 'Try sending again'}
          </button>
          {resendNote && <p className="mt-2 text-xs text-muted">{resendNote}</p>}

          <p className="mt-6 text-sm text-muted">
            Wrong email?{' '}
            <button onClick={() => setSent(null)} className="text-ink underline underline-offset-4 hover:text-accent">
              Start again
            </button>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <p className={labelClass + ' !text-accent'}>create account</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Start tracking.</h1>
        <p className="mt-2 text-sm text-muted">Free. Add your first vehicle in under a minute.</p>

        {formError && (
          <p role="alert" className="mt-6 border border-bad bg-card px-3 py-2 text-sm text-bad">
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <Field
            label="Name"
            id="name"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
          />
          <Field
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />
          <Field
            label="Password"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            hint="At least 8 characters, with a letter and a number."
          />
          <Field
            label="Km you drive per month (optional)"
            id="defaultMonthlyKm"
            name="defaultMonthlyKm"
            type="number"
            inputMode="numeric"
            min="0"
            max="20000"
            value={form.defaultMonthlyKm}
            onChange={handleChange}
            error={errors.defaultMonthlyKm}
            hint="Used to estimate your odometer between readings. You can change it per vehicle."
          />
          <button type="submit" disabled={loading} className={btnPrimary + ' w-full'}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-ink underline underline-offset-4 hover:text-accent">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default Register
