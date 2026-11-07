import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import api, { readError } from '../api'
import { loginSuccess } from '../store/authSlice'
import { validateLogin } from '../validate'
import Field from '../components/Field'
import AuthLayout from '../components/AuthLayout'
import useCooldown from '../useCooldown'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

function Login() {
  const location = useLocation()

  //email and notice come from the verify and reset pages, so the user only types the password
  const [form, setForm] = useState({ email: location.state?.email || '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  //set when the password was right but the email was never verified
  const [unverified, setUnverified] = useState(false)
  const [resendNote, setResendNote] = useState('')
  const [left, startCooldown, resetCooldown] = useCooldown(30)

  const token = useSelector((state) => state.auth.token)
  const dispatch = useDispatch()

  //if the user was sent here from a protected page, go back there after login
  const from = location.state?.from?.pathname || '/dashboard'

  //already logged in, also runs right after a successful login
  if (token) {
    return <Navigate to={from} replace />
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setUnverified(false)
    setResendNote('')

    const found = validateLogin(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email: form.email.trim(), password: form.password })
      dispatch(loginSuccess(res.data))
    } catch (err) {
      const { message, errors: fieldErrors } = readError(err)
      setErrors(fieldErrors)
      setFormError(message)
      setUnverified(err.response?.data?.code === 'email_not_verified')
      setLoading(false)
    }
  }

  const resend = async () => {
    setResendNote('')
    startCooldown()
    try {
      const res = await api.post('/auth/resend-verification', { email: form.email.trim() })
      if (res.data.emailSent === false) {
        //nothing was sent, so no waiting
        resetCooldown()
        setResendNote('We could not send the email just now. Try again in a moment.')
      } else {
        setResendNote('A new link is on its way.')
      }
    } catch (err) {
      setResendNote(readError(err).message)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <p className={labelClass + ' !text-accent'}>log in</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome back.</h1>
        <p className="mt-2 text-sm text-muted">Log in to see what your vehicles need.</p>

        {location.state?.notice && (
          <p role="status" className="mt-6 border border-good bg-card px-3 py-2 text-sm text-good">
            {location.state.notice}
          </p>
        )}

        {formError && (
          <p role="alert" className="mt-6 border border-bad bg-card px-3 py-2 text-sm text-bad">
            {formError}
          </p>
        )}

        {unverified && (
          <div className="mt-2">
            <button onClick={resend} disabled={left > 0} className={btnOutline + ' w-full'}>
              {left > 0 ? 'Send again in ' + left + 's' : 'Send the link again'}
            </button>
            {resendNote && <p className="mt-2 text-xs text-muted">{resendNote}</p>}
            <p className="mt-2 text-xs text-muted">Nothing in your inbox? Look in your spam folder too.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
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
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
          <p className="text-right text-xs">
            <Link to="/forgot-password" className="text-muted underline underline-offset-4 hover:text-accent">
              Forgot password?
            </Link>
          </p>
          <button type="submit" disabled={loading} className={btnPrimary + ' w-full'}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          No account yet?{' '}
          <Link to="/register" className="text-ink underline underline-offset-4 hover:text-accent">
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default Login
