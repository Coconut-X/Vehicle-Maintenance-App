import { useEffect, useMemo, useRef, useState } from 'react'
import api, { readError } from '../api'
import { formatDate } from '../format'
import ConfirmBox from './ConfirmBox'
import Field from './Field'
import { btnOutline, btnPrimary, labelClass } from './ui'

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024
const MAX_AT_ONCE = 6
const MAX_PER_DOCUMENT = 10

//returns a message when the picked files are not fine
const checkFiles = (files, alreadyThere = 0) => {
  if (files.length > MAX_AT_ONCE) return 'Pick at most ' + MAX_AT_ONCE + ' files at a time.'
  if (alreadyThere + files.length > MAX_PER_DOCUMENT) return 'A document can have ' + MAX_PER_DOCUMENT + ' pages at most.'
  for (const f of files) {
    if (!TYPES.includes(f.type)) return f.name + ' is not a jpg, png, webp or pdf file.'
    if (f.size > MAX_SIZE) return f.name + ' is bigger than 5MB.'
  }
  return ''
}

//the pages are sent as a form because they are files
const send = (method, path, fields, files) => {
  const body = new FormData()
  Object.entries(fields).forEach(([k, v]) => body.append(k, v))
  files.forEach((f) => body.append('files', f))
  return api({ method, url: path, data: body })
}

//a picture you tap to see big, a pdf opens in its own tab
function PageTile({ file, index, onOpen, onRemove, canRemove }) {
  return (
    <div className="group relative aspect-[3/2] border border-line bg-paper">
      {file.kind === 'image' ? (
        <button onClick={onOpen} className="block h-full w-full" aria-label={'Open page ' + (index + 1)}>
          <img src={file.thumbUrl} alt={'Page ' + (index + 1)} loading="lazy" className="h-full w-full object-cover" />
        </button>
      ) : (
        <a href={file.url} target="_blank" rel="noreferrer" className="flex h-full w-full flex-col items-center justify-center gap-1 hover:bg-card">
          <span className="border-2 border-ink px-2 py-0.5 font-mono text-xs font-bold">PDF</span>
          <span className="max-w-full truncate px-2 font-mono text-[10px] text-muted">{file.originalName || 'document'}</span>
        </a>
      )}
      <span className="pointer-events-none absolute bottom-0 left-0 bg-ink/80 px-1.5 py-0.5 font-mono text-[10px] text-white">{index + 1}</span>
      {canRemove && (
        <button
          onClick={onRemove}
          title="Remove this page"
          aria-label={'Remove page ' + (index + 1)}
          className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center bg-ink/80 font-mono text-sm text-white opacity-100 transition-colors hover:bg-bad sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        >
          &times;
        </button>
      )}
    </div>
  )
}

//full screen view of the pictures of one document, arrows and keys move between pages
function Lightbox({ doc, index, onMove, onClose }) {
  const images = doc.files.filter((f) => f.kind === 'image')
  const current = doc.files[index]
  const at = images.findIndex((f) => f._id === current._id)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onMove(1)
      if (e.key === 'ArrowLeft') onMove(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onMove])

  return (
    <div role="dialog" aria-label={doc.name} className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold [font-stretch:125%]">{doc.name}</p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/60">
            page {at + 1} of {images.length}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/40 text-xl hover:bg-white hover:text-ink">
          &times;
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
        <img src={current.url} alt={doc.name + ' page ' + (at + 1)} className="max-h-full max-w-full object-contain" />
        {images.length > 1 && (
          <>
            <button onClick={() => onMove(-1)} aria-label="Previous page" className="absolute left-2 flex h-12 w-12 items-center justify-center border border-white/40 bg-black/60 text-xl hover:bg-white hover:text-ink">
              &larr;
            </button>
            <button onClick={() => onMove(1)} aria-label="Next page" className="absolute right-2 flex h-12 w-12 items-center justify-center border border-white/40 bg-black/60 text-xl hover:bg-white hover:text-ink">
              &rarr;
            </button>
          </>
        )}
      </div>
    </div>
  )
}

//the papers of one car, each with a name and one or more pages
function DocumentsPanel({ vehicleId }) {
  const [result, setResult] = useState(null)
  const [reload, setReload] = useState(0)
  const [error, setError] = useState('')

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [files, setFiles] = useState([])
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [renaming, setRenaming] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [lightbox, setLightbox] = useState(null)

  const pagesInput = useRef(null)
  const pagesFor = useRef(null)

  //result remembers which car it is for, so loading is just a mismatch
  const loading = !result || result.vehicleId !== vehicleId
  const docs = result && !loading ? result.documents : []

  useEffect(() => {
    let cancelled = false
    api
      .get('/documents', { params: { vehicle: vehicleId } })
      .then((res) => {
        if (cancelled) return
        setError('')
        setResult({ vehicleId, documents: res.data.documents })
      })
      .catch((err) => {
        if (!cancelled) setError(readError(err).message)
      })
    return () => {
      cancelled = true
    }
  }, [vehicleId, reload])

  //little previews of the files picked in the form
  const previews = useMemo(() => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : '')), [files])
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews])

  const refresh = () => setReload((r) => r + 1)

  const pick = (e) => {
    const picked = [...e.target.files]
    e.target.value = ''
    const problem = checkFiles([...files, ...picked].slice(0, 50))
    setFormErrors({ files: problem })
    if (!problem) setFiles([...files, ...picked])
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    const found = {}
    if (name.trim().length < 1 || name.trim().length > 60) found.name = 'Give it a name of 1 to 60 characters.'
    if (files.length === 0) found.files = 'Add at least one photo or pdf.'
    setFormErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      await send('post', '/documents', { vehicle: vehicleId, name: name.trim() }, files)
      setAdding(false)
      setName('')
      setFiles([])
      refresh()
    } catch (err) {
      const info = readError(err)
      setFormErrors(Object.keys(info.errors).length > 0 ? info.errors : { files: info.message })
    }
    setSaving(false)
  }

  const addPages = async (e) => {
    const picked = [...e.target.files]
    e.target.value = ''
    const doc = docs.find((d) => d._id === pagesFor.current)
    if (!doc || picked.length === 0) return

    const problem = checkFiles(picked, doc.files.length)
    if (problem) {
      setActionError(problem)
      return
    }
    setActionError('')
    setBusy(true)
    try {
      await send('post', '/documents/' + doc._id + '/files', {}, picked)
      refresh()
    } catch (err) {
      setActionError(readError(err).message)
    }
    setBusy(false)
  }

  const saveRename = async (doc) => {
    if (renameValue.trim().length < 1 || renameValue.trim().length > 60) {
      setActionError('The name must be 1 to 60 characters.')
      return
    }
    setBusy(true)
    setActionError('')
    try {
      await api.put('/documents/' + doc._id, { name: renameValue.trim() })
      setRenaming(null)
      refresh()
    } catch (err) {
      setActionError(readError(err).message)
    }
    setBusy(false)
  }

  const doConfirm = async () => {
    setBusy(true)
    setActionError('')
    try {
      if (confirm.fileId) await api.delete('/documents/' + confirm.docId + '/files/' + confirm.fileId)
      else await api.delete('/documents/' + confirm.docId)
      setConfirm(null)
      refresh()
    } catch (err) {
      setActionError(readError(err).message)
    }
    setBusy(false)
  }

  //step to the next or previous picture of the open document, pdfs are skipped
  const moveLightbox = (step) => {
    setLightbox((lb) => {
      if (!lb) return lb
      const doc = docs.find((d) => d._id === lb.docId)
      if (!doc) return null
      let i = lb.index
      for (let n = 0; n < doc.files.length; n++) {
        i = (i + step + doc.files.length) % doc.files.length
        if (doc.files[i].kind === 'image') return { ...lb, index: i }
      }
      return lb
    })
  }

  const openDoc = lightbox ? docs.find((d) => d._id === lightbox.docId) : null

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-sm text-muted">
          Keep the papers of this car in one place, like the smart card or the registration book. Give each one a name and add its pages.
        </p>
        {!adding && (
          <button onClick={() => setAdding(true)} className={btnPrimary}>
            Add document
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 border border-bad bg-card px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}
      {actionError && (
        <p role="alert" className="mt-4 border border-bad bg-card px-3 py-2 text-sm text-bad">
          {actionError}
        </p>
      )}

      {adding && (
        <form onSubmit={handleAdd} noValidate className="mt-6 border-2 border-ink bg-card">
          <div className="bg-ink px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-accent">new document</div>
          <div className="space-y-4 p-4">
            <Field label="Name" id="docName" value={name} onChange={(e) => setName(e.target.value)} error={formErrors.name} placeholder="Smart card" hint="For example Smart card, Registration book or Insurance." />
            <div>
              <label htmlFor="docFiles" className={labelClass}>
                Pages (photos or pdf)
              </label>
              <input
                id="docFiles"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={pick}
                className="mt-1.5 block w-full text-sm text-muted file:mr-3 file:cursor-pointer file:border file:border-ink file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-ink hover:file:text-white"
              />
              <p className="mt-1 text-xs text-muted">Front, back, more pages. Up to {MAX_AT_ONCE} at a time, 5MB each. You can pick again to add more.</p>
              {formErrors.files && <p className="mt-1 text-xs text-bad">{formErrors.files}</p>}
            </div>
            {files.length > 0 && (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {files.map((f, i) => (
                  <li key={f.name + i} className="relative aspect-[3/2] border border-line bg-paper">
                    {previews[i] ? (
                      <img src={previews[i]} alt={f.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center font-mono text-xs font-bold">PDF</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, n) => n !== i))}
                      aria-label={'Remove ' + f.name}
                      className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center bg-ink/80 text-sm text-white hover:bg-bad"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? 'Uploading...' : 'Save document'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setAdding(false)
                  setName('')
                  setFiles([])
                  setFormErrors({})
                }}
                className={btnOutline}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading && !error && <p className="mt-8 font-mono text-xs uppercase tracking-widest text-muted">loading...</p>}

      {!loading && docs.length === 0 && !adding && (
        <div className="mt-6 border border-dashed border-line bg-card p-8">
          <p className="font-medium">No documents yet</p>
          <p className="mt-1 max-w-md text-sm text-muted">Add the first one, for example the smart card with its front and back.</p>
        </div>
      )}

      <input ref={pagesInput} aria-label="Add pages to a document" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={addPages} className="hidden" />

      <ul className="mt-6 space-y-6">
        {docs.map((doc) => (
          <li key={doc._id} className="border border-line bg-card">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                {renaming === doc._id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      aria-label="Document name"
                      className="border border-ink bg-card px-2 py-1 text-sm focus:outline-none"
                    />
                    <button onClick={() => saveRename(doc)} disabled={busy} className={btnPrimary + ' !px-3 !py-1'}>
                      Save
                    </button>
                    <button onClick={() => setRenaming(null)} className={btnOutline + ' !px-3 !py-1'}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="truncate font-display text-lg font-bold [font-stretch:125%]">{doc.name}</p>
                )}
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  {doc.files.length} {doc.files.length === 1 ? 'page' : 'pages'} / added {formatDate(doc.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                {doc.files.length < MAX_PER_DOCUMENT && (
                  <button
                    onClick={() => {
                      pagesFor.current = doc._id
                      pagesInput.current.click()
                    }}
                    disabled={busy}
                    className="underline underline-offset-4 hover:text-accent disabled:opacity-50"
                  >
                    Add pages
                  </button>
                )}
                <button
                  onClick={() => {
                    setRenaming(doc._id)
                    setRenameValue(doc.name)
                  }}
                  className="underline underline-offset-4 hover:text-accent"
                >
                  Rename
                </button>
                <button onClick={() => setConfirm({ docId: doc._id, name: doc.name })} className="underline underline-offset-4 hover:text-bad">
                  Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 md:grid-cols-5">
              {doc.files.map((f, i) => (
                <PageTile
                  key={f._id}
                  file={f}
                  index={i}
                  canRemove={doc.files.length > 1}
                  onOpen={() => setLightbox({ docId: doc._id, index: i })}
                  onRemove={() => setConfirm({ docId: doc._id, fileId: f._id, name: doc.name, page: i + 1 })}
                />
              ))}
            </div>

            {confirm && confirm.docId === doc._id && (
              <div className="border-t border-line bg-paper p-4">
                <ConfirmBox
                  title={confirm.fileId ? 'Remove page ' + confirm.page + ' of ' + confirm.name + '?' : 'Delete ' + confirm.name + '?'}
                  text={confirm.fileId ? 'This page is removed for good.' : 'The document and all its pages are removed for good.'}
                  confirmLabel={confirm.fileId ? 'Remove page' : 'Delete document'}
                  busy={busy}
                  error=""
                  onConfirm={doConfirm}
                  onCancel={() => setConfirm(null)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {openDoc && openDoc.files[lightbox.index] && (
        <Lightbox doc={openDoc} index={lightbox.index} onMove={moveLightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}

export default DocumentsPanel
