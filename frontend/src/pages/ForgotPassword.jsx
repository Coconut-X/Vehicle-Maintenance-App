import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { readError } from '../api'
import { validateForgot } from '../validate'
import Field from '../components/Field'
import AuthLayout from '../components/AuthLayout'
import useCooldown from '../useCooldown'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

//asks for the email and sends a reset link
function ForgotPassword() {
  const [form, setForm] = useState({ email: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [left, startCooldown] = useCooldown(60)

  const send = async (email) => {
    await api.post('/auth/forgot-password', { email })
    setSentTo(email)
    startCooldown()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const found = validateForgot(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setLoading(true)
    try {
      await send(form.email.trim())
    } catch (err) {
      setFormError(readError(err).message)
    }
    setLoading(false)
  }

  const sendAgain = async () => {
    setFormError('')
    try {
      await send(sentTo)
    } catch (err) {
      setFormError(readError(err).message)
    }
  }

  if (sentTo) {
    return (
      <AuthLayout>
        <div className="w-full max-w-sm">
          <p className={labelClass + ' !text-accent'}>password reset</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Check your email.</h1>
          <p className="mt-2 text-sm text-muted">
            If <span className="font-medium text-ink">{sentTo}</span> has an account, a link to choose a new password is on its way. It works for one hour.
          </p>

          {formError && (
            <p role="alert" className="mt-6 border border-bad bg-card px-3 py-2 text-sm text-bad">
              {formError}
            </p>
          )}

          <button onClick={sendAgain} disabled={left > 0} className={btnOutline + ' mt-6 w-full'}>
            {left > 0 ? 'Send again in ' + left + 's' : 'Send the link again'}
          </button>
          <p className="mt-6 text-sm text-muted">
            <Link to="/login" className="text-ink underline underline-offset-4 hover:text-accent">
              Back to login
            </Link>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <p className={labelClass + ' !text-accent'}>password reset</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="mt-2 text-sm text-muted">Enter your email and we will send you a link to choose a new one.</p>

        {formError && (
          <p role="alert" className="mt-6 border border-bad bg-card px-3 py-2 text-sm text-bad">
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <Field
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ email: e.target.value })}
            error={errors.email}
          />
          <button type="submit" disabled={loading} className={btnPrimary + ' w-full'}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          Remembered it?{' '}
          <Link to="/login" className="text-ink underline underline-offset-4 hover:text-accent">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default ForgotPassword
