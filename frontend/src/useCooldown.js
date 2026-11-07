import { useEffect, useState } from 'react'

//counts down in seconds after start() is called, stops people pressing resend again and again
function useCooldown(seconds) {
  const [endsAt, setEndsAt] = useState(0)
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (!endsAt) return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [endsAt])

  const left = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0

  const start = () => {
    const t = Date.now()
    setNow(t)
    setEndsAt(t + seconds * 1000)
  }

  //stops the wait, used when nothing was sent
  const reset = () => setEndsAt(0)

  return [left, start, reset]
}

export default useCooldown
