//inline confirmation for things that cant be undone
function ConfirmBox({ title, text, confirmLabel, busy, error, onConfirm, onCancel }) {
  return (
    <div role="alertdialog" aria-labelledby="confirm-title" className="border border-bad bg-card p-5">
      <p id="confirm-title" className="font-medium">
        {title}
      </p>
      <p className="mt-1 max-w-xl text-sm text-muted">{text}</p>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="inline-flex items-center justify-center bg-bad px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Deleting...' : confirmLabel}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center justify-center border border-ink px-4 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default ConfirmBox
