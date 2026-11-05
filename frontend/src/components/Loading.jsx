//shown while a page waits for the server
function Loading({ text = 'loading...' }) {
  return (
    <p role="status" className="py-10 font-mono text-xs uppercase tracking-widest text-muted">
      {text}
    </p>
  )
}

export default Loading
