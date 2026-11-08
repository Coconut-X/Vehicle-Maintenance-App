import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import api, { readError } from '../api'
import { loginSuccess, logout } from '../store/authSlice'
import { currencies } from '../format'
import AuthLayout from '../components/AuthLayout'
import Field from '../components/Field'
import Select from '../components/Select'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

//the page the link in an invitation email opens
function Join() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { token: loggedIn, user } = useSelector((state) => state.auth)

  //result remembers which link it is for, so loading is just a mismatch
  const [result, setResult] = useState(null)
  const [form, setForm] = useState({ name: '', password: '', currency: 'PKR' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    api
      .get('/groups/invites/' + token)
      .then((res) => {
        if (!cancelled) setResult({ token, info: res.data })
      })
      .catch((err) => {
        if (!cancelled) setResult({ token, error: readError(err).message })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const loading = token !== '' && (!result || result.token !== token)
  const info = result && result.token === token ? result.info : null
  const problem = !token ? 'This link is not complete. Open it again from your email.' : result && result.token === token ? result.error : ''

  const accept = async () => {
    const res = await api.post('/groups/invites/accept', { token })
    navigate('/groups/' + res.data.group._id, { replace: true, state: { notice: 'You joined ' + res.data.group.name + '.' } })
  }

  const handleAccept = async () => {
    setBusy(true)
    setMessage('')
    try {
      await accept()
    } catch (err) {
      setMessage(readError(err).message)
      setBusy(false)
    }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  //a new person signs up right here, the link proves the email so there is nothing to verify, then joins
  const handleSignup = async (e) => {
    e.preventDefault()
    const found = {}
    if (form.name.trim().length < 2 || form.name.trim().length > 60) found.name = 'Name must be 2 to 60 characters.'
    if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      found.password = 'Use at least 8 characters with a letter and a number.'
    }
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setBusy(true)
    setMessage('')
    try {
      const res = await api.post('/auth/register', {
        name: form.name.trim(),
        email: info.email,
        password: form.password,
        currency: form.currency,
        inviteToken: token,
      })
      dispatch(loginSuccess(res.data))
      await accept()
    } catch (err) {
      const e2 = readError(err)
      setErrors(e2.errors)
      setMessage(Object.keys(e2.errors).length > 0 ? '' : e2.message)
      setBusy(false)
    }
  }

  const goLogin = () => navigate('/login', { state: { from: { pathname: '/join', search: location.search }, email: info.email } })

  let body
  if (loading) {
    body = <p className="mt-6 font-mono text-xs uppercase tracking-widest text-muted">checking the invitation...</p>
  } else if (problem) {
    body = (
      <>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">This invitation does not work.</h1>
        <p className="mt-2 text-sm text-muted">{problem} It may have been used already, cancelled, or it ran out after 7 days. Ask the admin to send you a new one.</p>
        <Link to="/" className={btnOutline + ' mt-6'}>
          Go to the home page
        </Link>
      </>
    )
  } else if (info) {
    const same = loggedIn && user && user.email === info.email
    body = (
      <>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Join {info.groupName}.</h1>
        <p className="mt-2 text-sm text-muted">
          {info.invitedBy ? <span className="font-medium text-ink">{info.invitedBy}</span> : 'Someone'} invited <span className="font-mono text-ink">{info.email}</span> to share cars on CarVault.
        </p>

        {message && (
          <p role="alert" className="mt-5 border border-bad bg-card px-3 py-2 text-sm text-bad">
            {message}
          </p>
        )}

        {same && (
          <button onClick={handleAccept} disabled={busy} className={btnPrimary + ' mt-6 w-full'}>
            {busy ? 'Joining...' : 'Join ' + info.groupName}
          </button>
        )}

        {loggedIn && !same && (
          <div className="mt-6 border border-warn bg-card p-4 text-sm">
            <p>
              This invitation is for <span className="font-mono">{info.email}</span>, but you are logged in as <span className="font-mono">{user?.email}</span>.
            </p>
            <button onClick={() => dispatch(logout())} className={btnOutline + ' mt-3'}>
              Log out and continue
            </button>
          </div>
        )}

        {!loggedIn && info.hasAccount && (
          <>
            <p className="mt-6 text-sm text-muted">You already have an account with this email. Log in and you join straight away.</p>
            <button onClick={goLogin} className={btnPrimary + ' mt-4 w-full'}>
              Log in to join
            </button>
          </>
        )}

        {!loggedIn && !info.hasAccount && (
          <form onSubmit={handleSignup} noValidate className="mt-6 space-y-4">
            <div>
              <p className={labelClass}>email</p>
              <p className="mt-1.5 border border-line bg-paper px-3 py-2 font-mono text-sm text-muted">{info.email}</p>
            </div>
            <Field label="Your name" id="name" name="name" autoComplete="name" value={form.name} onChange={handleChange} error={errors.name} />
            <Field
              label="Choose a password"
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              hint="At least 8 characters, with a letter and a number."
            />
            <Select label="Your currency" id="currency" name="currency" value={form.currency} onChange={handleChange} options={currencies} />
            {errors.inviteToken && <p className="text-xs text-bad">{errors.inviteToken}</p>}
            <button type="submit" disabled={busy} className={btnPrimary + ' w-full'}>
              {busy ? 'Making your account...' : 'Create my account and join'}
            </button>
          </form>
        )}
      </>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <p className={labelClass + ' !text-accent'}>invitation</p>
        {body}
      </div>
    </AuthLayout>
  )
}

export default Join
