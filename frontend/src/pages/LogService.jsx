import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api, { readError } from '../api'
import { validateService } from '../validate'
import { formatDate, formatKm, itemFits, vehicleName } from '../format'
import { useSelector } from 'react-redux'
import ErrorNote from '../components/ErrorNote'
import Field from '../components/Field'
import Loading from '../components/Loading'
import Select from '../components/Select'
import TextArea from '../components/TextArea'
import Plate from '../components/Plate'
import Telltale from '../components/Telltale'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

//today as yyyy-mm-dd for the date input, using local time not utc
const today = () => {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + month + '-' + day
}

//one numbered block of the job card
function Section({ no, title, children }) {
  return (
    <fieldset className="border-t border-line px-5 py-5 first-of-type:border-t-0">
      <legend className="sr-only">{title}</legend>
      <p className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted" aria-hidden="true">
        <span className="bg-accent px-1.5 py-0.5 text-white">{no}</span>
        {title}
      </p>
      {children}
    </fieldset>
  )
}

//log a completed job for one vehicle, /vehicles/:id/log?item=<catalogue item id>
function LogService() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const itemParam = searchParams.get('item') || ''
  const navigate = useNavigate()
  const currency = useSelector((state) => state.auth.user?.currency) || 'PKR'

  //data remembers which vehicle it belongs to, so loading is just a mismatch
  const [data, setData] = useState(null)
  const [form, setForm] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  //what the odometer can have been on the picked date, remembers which date it is for
  const [range, setRange] = useState(null)
  const pickedDate = form ? form.serviceDate : ''

  useEffect(() => {
    let cancelled = false

    Promise.all([api.get('/vehicles/' + id), api.get('/catalogue')])
      .then(([v, c]) => {
        if (cancelled) return
        const vehicle = v.data.vehicle
        const projection = v.data.projection
        //only the items this car actually needs, no engine oil for an electric car
        const items = c.data.items.filter((i) => itemFits(i, vehicle.powertrain))
        setData({ id, vehicle, projection, items })

        //the km field starts empty, the range under it helps and an empty one is estimated from the date
        setForm({
          item: itemParam,
          serviceDate: today(),
          odometerKm: '',
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

  useEffect(() => {
    if (!pickedDate) return
    let cancelled = false

    api
      .get('/services/odometer-range', { params: { vehicle: id, date: pickedDate } })
      .then((res) => {
        if (!cancelled) setRange({ key: id + '|' + pickedDate, ...res.data })
      })
      .catch(() => {
        //the hint is only a help, the form works without it
        if (!cancelled) setRange({ key: id + '|' + pickedDate, none: true })
      })

    return () => {
      cancelled = true
    }
  }, [id, pickedDate])

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
    if (form.odometerKm !== '') body.append('odometerKm', form.odometerKm)
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
      if (res.data.record.odometerEstimated) notice += ' Odometer estimated at about ' + formatKm(res.data.record.odometerKm) + '.'
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

  const picked = data.items.find((i) => i._id === form.item)
  //the range only counts if it was asked for the date that is picked now
  const shownRange = range && range.key === id + '|' + pickedDate && !range.none ? range : null

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to={'/vehicles/' + id} className="font-mono text-xs uppercase tracking-widest text-muted hover:text-ink">
        &larr; {vehicleName(data.vehicle)}
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">What did you get done?</h1>
      <p className="mt-2 text-sm text-muted">
        Saving this resets the item&apos;s schedule and makes the km estimate for {vehicleName(data.vehicle)} more accurate.
      </p>

      <div className="mt-6">
        <ErrorNote message={formError} />
      </div>

      {/*the form is drawn like the job card a workshop fills in for every car*/}
      <form onSubmit={handleSubmit} noValidate className="mt-2 border-2 border-ink bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-ink px-5 py-3 text-white">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">workshop job card</p>
            <p className="font-display text-lg font-bold uppercase [font-stretch:125%]">{vehicleName(data.vehicle)}</p>
          </div>
          <Plate number={data.vehicle.registrationNo} />
        </div>

        <Section no="01" title="work done">
          <div className="flex items-end gap-3">
            {picked && <Telltale name={picked.name} category={picked.category} />}
            <div className="flex-1">
              <Select label="Maintenance item" id="item" name="item" value={form.item} onChange={handleChange} options={itemOptions} />
            </div>
          </div>
          {errors.item && <p className="mt-1 text-xs text-bad">{errors.item}</p>}
        </Section>

        <Section no="02" title="when and at what reading">
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
              label="Odometer (km, optional)"
              id="odometerKm"
              name="odometerKm"
              type="number"
              inputMode="numeric"
              placeholder={shownRange ? shownRange.from.toLocaleString('en-US') + ' - ' + shownRange.to.toLocaleString('en-US') : ''}
              value={form.odometerKm}
              onChange={handleChange}
              error={errors.odometerKm}
              hint={
                (shownRange
                  ? 'For this date it was between ' + shownRange.from.toLocaleString('en-US') + ' and ' + shownRange.to.toLocaleString('en-US') + ' km. '
                  : '') + 'Dont remember it? Leave it empty and we will estimate it from the date.'
              }
            />
          </div>
        </Section>

        <Section no="03" title="bill">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={'Cost (' + currency + ', optional)'}
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
        </Section>

        <Section no="04" title="remarks and receipt">
          <TextArea label="Notes (optional)" id="notes" name="notes" value={form.notes} onChange={handleChange} error={errors.notes} />
          <div className="mt-5">
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
        </Section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-dashed border-ink px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">job closed / signed off by you</p>
          <div className="flex gap-3">
            <Link to={'/vehicles/' + id} className={btnOutline}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? 'Saving...' : 'Close job'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default LogService
