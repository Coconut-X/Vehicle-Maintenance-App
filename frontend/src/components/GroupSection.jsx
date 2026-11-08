import { Link } from 'react-router-dom'
import { btnOutline, btnPrimary } from './ui'

//one part of the dashboard or the garage, the cars of a family or group, or the cars that are only yours
//group is null for "my cars"
function GroupSection({ group, count, children }) {
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">{group ? 'family / group' : 'only mine'}</p>
          <h2 className="truncate font-display text-xl font-bold uppercase [font-stretch:125%]">{group ? group.name : 'My cars'}</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-muted">
            {count} {count === 1 ? 'car' : 'cars'}
            {group ? ' / ' + group.memberCount + (group.memberCount === 1 ? ' person' : ' people') : ''}
          </span>
          {group && (
            <Link to={'/groups/' + group._id} className="text-xs underline underline-offset-4 hover:text-accent">
              Manage
            </Link>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

//a group that has no cars, it is still shown so it can be opened and filled
export function EmptyGroup({ group }) {
  return (
    <div className="mt-4 border border-dashed border-line bg-card px-5 py-8 text-center">
      <p className="font-medium">No cars added yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Add a new car for {group.name}, or put one of your own cars in it.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link to={'/vehicles/new?group=' + group._id} className={btnPrimary}>
          Add a car
        </Link>
        <Link to={'/groups/' + group._id} className={btnOutline}>
          Add one of mine
        </Link>
      </div>
    </div>
  )
}

export default GroupSection
