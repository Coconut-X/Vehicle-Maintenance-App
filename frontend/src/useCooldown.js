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

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))

  const start = () => {
    const t = Date.now()
    setNow(t)
    setEndsAt(t + seconds * 1000)
  }

  return [left, start]
}

export default useCooldown
