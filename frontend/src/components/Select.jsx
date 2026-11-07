import { useEffect, useRef, useState } from 'react'
import { labelClass } from './ui'

//dropdown drawn by us so it matches the rest of the app, the browsers own list cant be styled
//props are the same as a normal select, options is a list of { value, label }
//onChange gets an object with target.name and target.value so the pages dont need to change
function Select({ label, id, name, value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [openUp, setOpenUp] = useState(false)
  const box = useRef(null)
  const list = useRef(null)
  const button = useRef(null)

  const selectedIndex = Math.max(0, options.findIndex((o) => String(o.value) === String(value)))
  const selected = options[selectedIndex]
  const listId = id + '-list'

  //a tap outside closes it
  useEffect(() => {
    if (!open) return
    const onOutside = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [open])

  //keep the highlighted row inside the visible part of the list
  useEffect(() => {
    if (!open || !list.current) return
    const row = list.current.children[active]
    if (!row) return
    const top = row.offsetTop
    const bottom = top + row.offsetHeight
    if (top < list.current.scrollTop) list.current.scrollTop = top
    else if (bottom > list.current.scrollTop + list.current.clientHeight) list.current.scrollTop = bottom - list.current.clientHeight
  }, [open, active])

  const openList = () => {
    //open upwards when there is more room above, so the list is never cut off at the bottom of the screen
    const rect = box.current.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom
    setOpenUp(below < 280 && rect.top > below)
    setActive(selectedIndex)
    setOpen(true)
  }

  const choose = (index) => {
    const option = options[index]
    setOpen(false)
    button.current.focus()
    if (String(option.value) !== String(value)) onChange({ target: { name, value: option.value } })
  }

  const handleKey = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(options.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(options.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={box} className="relative">
      <span id={id + '-label'} className={labelClass}>
        {label}
      </span>
      <button
        ref={button}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={id + '-label ' + id}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKey}
        className={
          'mt-1.5 flex w-full items-center justify-between gap-3 border bg-card px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ink ' +
          (open ? 'border-ink' : 'border-line hover:border-ink/50 focus:border-ink')
        }
      >
        <span className="truncate">{selected ? selected.label : ''}</span>
        <svg viewBox="0 0 10 6" className={'h-2 w-2.5 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')} aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>

      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-labelledby={id + '-label'}
          className={
            'absolute inset-x-0 z-20 max-h-64 overflow-y-auto border border-ink bg-card ' + (openUp ? 'bottom-full mb-px' : 'top-full mt-px')
          }
        >
          {options.map((o, i) => {
            const isSelected = i === selectedIndex
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={
                  'flex cursor-pointer items-center justify-between gap-3 border-l-2 px-3 py-2.5 text-sm ' +
                  (isSelected ? 'border-accent font-medium ' : 'border-transparent ') +
                  (i === active ? 'bg-paper' : '')
                }
              >
                <span className="min-w-0">{o.label}</span>
                {isSelected && (
                  <svg viewBox="0 0 12 10" className="h-2.5 w-3 shrink-0 text-accent" aria-hidden="true">
                    <path d="M1 5l3.5 3.5L11 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Select
