import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api, { readError } from '../api'
import { validateReset } from '../validate'
import Field from '../components/Field'
import AuthLayout from '../components/AuthLayout'
import { btnPrimary, labelClass } from '../components/ui'

//the page the link in the reset email opens, the user types the new password here
function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const found = validateReset(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password: form.password })
      navigate('/login', { state: { notice: 'Password changed. Log in with the new one.' } })
    } catch (err) {
      const { message, errors: fieldErrors } = readError(err)
      setErrors({ password: fieldErrors.password })
      //a link that is wrong or old is not a field problem, so it shows on top
      setFormError(fieldErrors.password ? '' : message)
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout>
        <div className="w-full max-w-sm">
          <p className={labelClass + ' !text-accent'}>password reset</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">This link is not complete.</h1>
          <p className="mt-2 text-sm text-muted">Open the link from your email again, or ask for a new one.</p>
          <Link to="/forgot-password" className={btnPrimary + ' mt-6 w-full'}>
            Get a new link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <p className={labelClass + ' !text-accent'}>password reset</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Choose a new password.</h1>
        <p className="mt-2 text-sm text-muted">You will log in with it right after.</p>

        {formError && (
          <div role="alert" className="mt-6 border border-bad bg-card px-3 py-2 text-sm text-bad">
            {formError}{' '}
            <Link to="/forgot-password" className="underline underline-offset-4">
              Get a new link
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <Field
            label="New password"
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
            label="Repeat the password"
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={handleChange}
            error={errors.confirm}
          />
          <button type="submit" disabled={loading} className={btnPrimary + ' w-full'}>
            {loading ? 'Saving...' : 'Change password'}
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}

export default ResetPassword
