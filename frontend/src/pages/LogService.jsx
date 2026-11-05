import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api, { readError } from '../api'
import { validateService } from '../validate'
import { formatDate, vehicleName } from '../format'
import ErrorNote from '../components/ErrorNote'
import Field from '../components/Field'
import Loading from '../components/Loading'
import Select from '../components/Select'
import TextArea from '../components/TextArea'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

//today as yyyy-mm-dd for the date input, using local time not utc
const today = () => {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + month + '-' + day
}

//log a completed job for one vehicle, /vehicles/:id/log?item=<catalogue item id>
function LogService() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const itemParam = searchParams.get('item') || ''
  const navigate = useNavigate()

  //data remembers which vehicle it belongs to, so loading is just a mismatch
  const [data, setData] = useState(null)
  const [form, setForm] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([api.get('/vehicles/' + id), api.get('/catalogue')])
      .then(([v, c]) => {
        if (cancelled) return
        const vehicle = v.data.vehicle
        const projection = v.data.projection
        setData({ id, vehicle, projection, items: c.data.items })

        //the km field starts with the estimate, the user confirms or corrects it
        setForm({
          item: itemParam,
          serviceDate: today(),
          odometerKm: String(projection.projectedKm ?? vehicle.odometerKm),
          cost: '',
          workshop: '',
          notes: '',
        })
      })
      .catch((err) => {
        if (cancelled) return
        setData({ id, error: readError(err).message })
      })

    return () => {
      cancelled = true
    }
  }, [id, itemParam])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const found = validateService(form, receipt)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    //formdata because the receipt is a file
    const body = new FormData()
    body.append('vehicle', id)
    body.append('item', form.item)
    body.append('serviceDate', form.serviceDate)
    body.append('odometerKm', form.odometerKm)
    if (form.cost !== '') body.append('cost', form.cost)
    if (form.workshop.trim() !== '') body.append('workshop', form.workshop.trim())
    if (form.notes.trim() !== '') body.append('notes', form.notes.trim())
    if (receipt) body.append('receipt', receipt)

    setSaving(true)
    try {
      const res = await api.post('/services', body)
      const itemName = res.data.record.item.name
      const due = res.data.due

      //the vehicle page shows this message
      let notice = itemName + ' logged.'
      if (due && due.dueDate) notice += ' Next due ' + formatDate(due.dueDate) + '.'

      navigate('/vehicles/' + id, { state: { notice, warning: res.data.warning } })
    } catch (err) {
      const { message, errors: fieldErrors } = readError(err)
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : message)
      setSaving(false)
    }
  }

  if (!data || data.id !== id || (!data.error && !form)) return <div className="mx-auto max-w-6xl px-6"><Loading /></div>

  if (data.error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="font-medium">We could not open this vehicle</p>
        <p className="mt-1 text-sm text-muted">{data.error}</p>
        <Link to="/garage" className={btnOutline + ' mt-4'}>
          Back to garage
        </Link>
      </div>
    )
  }

  const itemOptions = [{ value: '', label: 'Choose...' }].concat(
    data.items.map((i) => ({ value: i._id, label: i.category + ' - ' + i.name }))
  )

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link to={'/vehicles/' + id} className="font-mono text-xs uppercase tracking-widest text-muted hover:text-ink">
        &larr; {vehicleName(data.vehicle)}
      </Link>
      <p className={labelClass + ' mt-6'}>log service</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">What did you get done?</h1>
      <p className="mt-2 text-sm text-muted">
        Saving this resets the item&apos;s schedule and makes the km estimate for {vehicleName(data.vehicle)} more accurate.
      </p>

      <div className="mt-6">
        <ErrorNote message={formError} />
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-2 space-y-5">
        <Select label="Maintenance item" id="item" name="item" value={form.item} onChange={handleChange} options={itemOptions} />
        {errors.item && <p className="-mt-3 text-xs text-bad">{errors.item}</p>}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Date"
            id="serviceDate"
            name="serviceDate"
            type="date"
            max={today()}
            value={form.serviceDate}
            onChange={handleChange}
            error={errors.serviceDate}
          />
          <Field
            label="Odometer (km)"
            id="odometerKm"
            name="odometerKm"
            type="number"
            inputMode="numeric"
            value={form.odometerKm}
            onChange={handleChange}
            error={errors.odometerKm}
            hint={
              data.projection.projectedKm === null
                ? 'The reading at the time of the service.'
                : 'Our estimate. Correct it if your odometer shows something else, this keeps predictions accurate.'
            }
          />
          <Field
            label="Cost (optional)"
            id="cost"
            name="cost"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.cost}
            onChange={handleChange}
            error={errors.cost}
          />
          <Field
            label="Workshop (optional)"
            id="workshop"
            name="workshop"
            placeholder="Ali Motors"
            value={form.workshop}
            onChange={handleChange}
            error={errors.workshop}
          />
        </div>

        <TextArea label="Notes (optional)" id="notes" name="notes" value={form.notes} onChange={handleChange} error={errors.notes} />

        <div>
          <label htmlFor="receipt" className={labelClass}>
            Receipt (optional)
          </label>
          <input
            id="receipt"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setReceipt(e.target.files[0] || null)}
            className="mt-1.5 block w-full text-sm text-muted file:mr-3 file:cursor-pointer file:border file:border-ink file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-ink hover:file:text-white"
          />
          <p className="mt-1 text-xs text-muted">JPG, PNG, WebP or PDF, up to 5MB.</p>
          {errors.receipt && <p className="mt-1 text-xs text-bad">{errors.receipt}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Saving...' : 'Save service'}
          </button>
          <Link to={'/vehicles/' + id} className={btnOutline}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

export default LogService
