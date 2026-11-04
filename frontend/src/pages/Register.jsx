import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import api, { readError } from '../api'
import { loginSuccess } from '../store/authSlice'
import { validateRegister } from '../validate'
import Field from '../components/Field'
import { btnPrimary, labelClass } from '../components/ui'

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', defaultMonthlyKm: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const token = useSelector((state) => state.auth.token)
  const dispatch = useDispatch()

  //already logged in, also runs right after a successful signup
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
      dispatch(loginSuccess(res.data))
    } catch (err) {
      //server field errors like email already registered show under the field
      const { message, errors: fieldErrors } = readError(err)
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : message)
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
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
  )
}

export default Register
