//red box for errors, empty message shows nothing
function ErrorNote({ message }) {
  if (!message) return null
  return (
    <p role="alert" className="border border-bad bg-card px-3 py-2 text-sm text-bad">
      {message}
    </p>
  )
}

export default ErrorNote
