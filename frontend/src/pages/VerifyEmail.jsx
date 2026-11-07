import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api, { readError } from '../api'
import AuthLayout from '../components/AuthLayout'
import { btnPrimary, labelClass } from '../components/ui'

//the link works only once and react runs effects twice in development
//so the request is kept here and both runs wait for the same answer
const requests = {}

//the page the link in the verification email opens
function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  //result remembers which token it is for, so loading is just a mismatch
  const [result, setResult] = useState(null)
  const loading = token !== '' && (!result || result.token !== token)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    if (!requests[token]) requests[token] = api.post('/auth/verify-email', { token })
    requests[token]
      .then((res) => {
        if (cancelled) return
        //tells the signup page, if it is open in another tab, to go to login
        try {
          localStorage.setItem('carvault_verified', JSON.stringify({ email: res.data.email, at: Date.now() }))
        } catch {
          //storage can be blocked, the button below still works
        }
        setResult({ token, ok: true, email: res.data.email })
      })
      .catch((err) => {
        if (!cancelled) setResult({ token, ok: false, message: readError(err).message })
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const ok = result && result.token === token && result.ok

  //go to login by itself a moment after it worked
  useEffect(() => {
    if (!ok) return
    const timer = setTimeout(() => {
      navigate('/login', { state: { notice: 'Email verified. Log in to start.', email: result.email } })
    }, 2500)
    return () => clearTimeout(timer)
  }, [ok, result, navigate])

  let heading = 'Verifying...'
  let text = 'One moment.'
  if (!token) {
    heading = 'This link is not complete.'
    text = 'Open the link from your email again, or sign up to get a new one.'
  } else if (ok) {
    heading = 'Email verified.'
    text = 'Your account is ready. Taking you to login...'
  } else if (!loading) {
    heading = 'This link did not work.'
    text = result.message + '. If you already verified, just log in. Otherwise ask for a new link on the login page.'
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <p className={labelClass + ' !text-accent'}>email check</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-2 text-sm text-muted">{text}</p>

        <p
          role="status"
          className="mt-6 flex items-center gap-2 border border-line bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-muted"
        >
          <span className={'h-2 w-2 ' + (loading ? 'lamp-blink bg-lamp-amber' : ok ? 'bg-lamp-green' : 'bg-lamp-red')} aria-hidden="true" />
          {loading ? 'checking the link' : ok ? 'verified' : 'not verified'}
        </p>

        {!loading && (
          <Link to="/login" className={btnPrimary + ' mt-6 w-full'}>
            Go to login
          </Link>
        )}
      </div>
    </AuthLayout>
  )
}

export default VerifyEmail
