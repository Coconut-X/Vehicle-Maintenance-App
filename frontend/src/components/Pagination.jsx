import { btnOutline } from './ui'

//previous and next buttons with the current page and total count
function Pagination({ page, pages, total, label, onChange }) {
  if (total === 0) return null

  return (
    <div className="mt-8 flex items-center justify-between gap-4">
      <p className="font-mono text-xs text-muted">
        {total} {total === 1 ? label.replace(/s$/, '') : label} / page {page} of {Math.max(pages, 1)}
      </p>
      <div className="flex gap-2">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className={btnOutline + ' !py-1.5'}>
          Previous
        </button>
        <button onClick={() => onChange(page + 1)} disabled={page >= pages} className={btnOutline + ' !py-1.5'}>
          Next
        </button>
      </div>
    </div>
  )
}

export default Pagination
