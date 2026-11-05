import { labelClass } from './ui'

//same look as Field but for longer text
function TextArea({ label, id, error, hint, ...textareaProps }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? id + '-error' : undefined}
        className={
          'mt-1.5 w-full border bg-card px-3 py-2 text-sm transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink ' +
          (error ? 'border-bad' : 'border-line')
        }
        {...textareaProps}
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

export default TextArea
