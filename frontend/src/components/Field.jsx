import { labelClass } from './ui'

//label + input + error message, used by all forms
function Field({ label, id, error, hint, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? id + '-error' : undefined}
        className={
          'mt-1.5 w-full border bg-card px-3 py-2 text-sm transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink ' +
          (error ? 'border-bad' : 'border-line')
        }
        {...inputProps}
      />
      {error ? (
        <p id={id + '-error'} className="mt-1 text-xs text-bad">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export default Field
