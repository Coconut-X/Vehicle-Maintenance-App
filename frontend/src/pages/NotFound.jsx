import { Link } from 'react-router-dom'
import { btnOutline, labelClass } from '../components/ui'

function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <p className={labelClass}>error 404</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">This page does not exist.</h1>
      <p className="mt-3 max-w-md text-muted">
        The link may be old or mistyped. Nothing is broken on your side.
      </p>
      <Link to="/" className={btnOutline + ' mt-8'}>
        Back to home
      </Link>
    </div>
  )
}

export default NotFound
