import { labelClass } from './ui'

//label + dropdown, options is a list of { value, label }
function Select({ label, id, options, ...selectProps }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select
        id={id}
        className="mt-1.5 w-full border border-line bg-card px-3 py-2 text-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
        {...selectProps}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default Select
