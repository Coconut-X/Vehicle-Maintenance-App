import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import api, { readError } from '../api'
import { loginSuccess } from '../store/authSlice'
import { validateLogin } from '../validate'
import Field from '../components/Field'
import { btnPrimary, labelClass } from '../components/ui'

function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const token = useSelector((state) => state.auth.token)
  const dispatch = useDispatch()
  const location = useLocation()

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
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <p className={labelClass + ' !text-accent'}>log in</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome back.</h1>
      <p className="mt-2 text-sm text-muted">Log in to see what your vehicles need.</p>

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
  )
}

export default Login
