import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { readError } from '../api'
import { validateVehicle } from '../validate'
import { powertrains, vehicleName } from '../format'
import Field from '../components/Field'
import { btnOutline, btnPrimary, labelClass } from '../components/ui'

const emptyForm = {
  make: '',
  model: '',
  year: '',
  registrationNo: '',
  nickname: '',
  odometerKm: '',
  avgMonthlyKm: '',
  powertrain: 'petrol',
}

//used for both adding (/vehicles/new) and editing (/vehicles/:id/edit)
function VehicleForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [photo, setPhoto] = useState(null)
  const [savedPhotoUrl, setSavedPhotoUrl] = useState('')
  const [title, setTitle] = useState('')
  const [savedPowertrain, setSavedPowertrain] = useState('petrol')

  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  //load the vehicle when editing
  useEffect(() => {
    if (!isEdit) return
    let cancelled = false

    api
      .get('/vehicles/' + id)
      .then((res) => {
        if (cancelled) return
        const v = res.data.vehicle
        setForm({
          make: v.make,
          model: v.model,
          year: String(v.year),
          registrationNo: v.registrationNo,
          nickname: v.nickname || '',
          odometerKm: String(v.odometerKm),
          avgMonthlyKm: v.avgMonthlyKm ? String(v.avgMonthlyKm) : '',
          powertrain: v.powertrain || 'petrol',
        })
        setSavedPowertrain(v.powertrain || 'petrol')
        setSavedPhotoUrl(v.photoUrl || '')
        setTitle(vehicleName(v))
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setFormError(readError(err).message)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  //preview of the picked file, the old url is freed when the file changes
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : ''), [photo])
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handlePhoto = (e) => {
    setPhoto(e.target.files[0] || null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const found = validateVehicle(form, photo)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    //formdata because the photo is a file
    const body = new FormData()
    body.append('make', form.make.trim())
    body.append('model', form.model.trim())
    body.append('year', form.year)
    body.append('registrationNo', form.registrationNo.trim())
    body.append('odometerKm', form.odometerKm)
    body.append('powertrain', form.powertrain)
    if (isEdit || form.nickname.trim() !== '') body.append('nickname', form.nickname.trim())
    if (form.avgMonthlyKm !== '') body.append('avgMonthlyKm', form.avgMonthlyKm)
    if (photo) body.append('photo', photo)

    setSaving(true)
    try {
      const res = isEdit ? await api.put('/vehicles/' + id, body) : await api.post('/vehicles', body)
      //the vehicle page shows the warning if the photo upload failed
      navigate('/vehicles/' + res.data.vehicle._id, { state: { warning: res.data.warning } })
    } catch (err) {
      const { message, errors: fieldErrors } = readError(err)
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : message)
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="mx-auto max-w-6xl px-6 py-12 font-mono text-xs uppercase tracking-widest text-muted">loading...</p>
  }

  const shownPhoto = preview || savedPhotoUrl
  const backTo = isEdit ? '/vehicles/' + id : '/garage'

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className={labelClass}>{isEdit ? 'edit vehicle' : 'new vehicle'}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{isEdit ? 'Edit ' + title : 'Add a vehicle'}</h1>
      {!isEdit && (
        <p className="mt-2 text-sm text-muted">
          We will set up all the standard maintenance items for it. You can change their intervals later.
        </p>
      )}

      {formError && (
        <p role="alert" className="mt-6 border border-bad bg-card px-3 py-2 text-sm text-bad">
          {formError}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Make" id="make" name="make" placeholder="Toyota" value={form.make} onChange={handleChange} error={errors.make} />
          <Field label="Model" id="model" name="model" placeholder="Corolla" value={form.model} onChange={handleChange} error={errors.model} />
          <Field
            label="Year"
            id="year"
            name="year"
            type="number"
            inputMode="numeric"
            placeholder="2018"
            value={form.year}
            onChange={handleChange}
            error={errors.year}
          />
          <Field
            label="Registration number"
            id="registrationNo"
            name="registrationNo"
            placeholder="LEA-1234"
            value={form.registrationNo}
            onChange={handleChange}
            error={errors.registrationNo}
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
            hint={isEdit ? 'Changing this saves a new reading as of today.' : 'The reading on the dashboard right now.'}
          />
          <Field
            label="Km per month"
            id="avgMonthlyKm"
            name="avgMonthlyKm"
            type="number"
            inputMode="numeric"
            value={form.avgMonthlyKm}
            onChange={handleChange}
            error={errors.avgMonthlyKm}
            hint="Used to estimate the odometer between readings. Needed to predict km-based jobs."
          />
        </div>

        <fieldset>
          <legend className={labelClass}>Powertrain</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            {powertrains.map((p) => (
              <label
                key={p.value}
                className={
                  'cursor-pointer px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ' +
                  (form.powertrain === p.value ? 'bg-ink text-white' : 'bg-card hover:bg-paper')
                }
              >
                <input
                  type="radio"
                  name="powertrain"
                  value={p.value}
                  checked={form.powertrain === p.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="block font-medium">{p.label}</span>
                <span className={'block font-mono text-[11px] ' + (form.powertrain === p.value ? 'text-white/70' : 'text-muted')}>
                  {p.value === 'petrol' ? 'ICE' : p.value === 'hybrid' ? 'HEV' : p.value === 'phev' ? 'PHEV' : 'EV'}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">
            {isEdit && form.powertrain !== savedPowertrain
              ? 'Saving turns schedule items on or off to match the new powertrain. Items you turned off by hand come back on.'
              : form.powertrain === 'electric'
                ? 'No engine oil, filters, spark plugs or timing belt. Adds a high voltage battery check.'
                : form.powertrain === 'petrol'
                  ? 'All standard engine and chassis items.'
                  : 'Engine items plus a high voltage battery check.'}
          </p>
          {errors.powertrain && <p className="mt-1 text-xs text-bad">{errors.powertrain}</p>}
        </fieldset>

        <Field
          label="Nickname (optional)"
          id="nickname"
          name="nickname"
          placeholder="Daily driver"
          value={form.nickname}
          onChange={handleChange}
          error={errors.nickname}
        />

        <div>
          <label htmlFor="photo" className={labelClass}>
            Photo (optional)
          </label>
          <div className="mt-1.5 flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="aspect-[16/9] w-full border border-line bg-card sm:w-56 sm:shrink-0">
              {shownPhoto ? (
                <img src={shownPhoto} alt="Vehicle preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-widest text-muted">
                  no photo
                </div>
              )}
            </div>
            <div className="min-w-0">
              <input
                id="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhoto}
                aria-invalid={errors.photo ? 'true' : 'false'}
                className="block w-full text-sm text-muted file:mr-3 file:cursor-pointer file:border file:border-ink file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-ink hover:file:text-white"
              />
              <p className="mt-1 text-xs text-muted">JPG, PNG or WebP, up to 5MB.</p>
              {errors.photo && <p className="mt-1 text-xs text-bad">{errors.photo}</p>}
              {photo && (
                <button type="button" onClick={() => setPhoto(null)} className="mt-2 text-xs underline underline-offset-4 hover:text-accent">
                  Remove selected photo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add vehicle'}
          </button>
          <Link to={backTo} className={btnOutline}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

export default VehicleForm
