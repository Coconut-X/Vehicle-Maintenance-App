//small helpers to show numbers and dates the same way everywhere

export const formatKm = (km) => {
  if (km === null || km === undefined) return '-'
  return Number(km).toLocaleString('en-US') + ' km'
}

export const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

//nickname if there is one otherwise make and model
export const vehicleName = (v) => {
  return v.nickname || v.make + ' ' + v.model
}

//days left as a sentence, negative means it already passed
export const daysText = (days) => {
  if (days === null || days === undefined) return ''
  if (days < 0) return Math.abs(days) + (Math.abs(days) === 1 ? ' day overdue' : ' days overdue')
  if (days === 0) return 'due today'
  return 'in ' + days + (days === 1 ? ' day' : ' days')
}

export const kmLeftText = (km) => {
  if (km === null || km === undefined) return ''
  if (km < 0) return formatKm(Math.abs(km)) + ' over'
  return formatKm(km) + ' left'
}

//cost without a currency symbol, up to 2 decimals
export const formatMoney = (amount) => {
  if (amount === null || amount === undefined) return '-'
  return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

//short and long names for the powertrain choices
export const powertrains = [
  { value: 'petrol', label: 'Petrol', long: 'Petrol engine only' },
  { value: 'hybrid', label: 'Hybrid', long: 'Self charging hybrid (HEV)' },
  { value: 'phev', label: 'Plug-in hybrid', long: 'Plug-in hybrid (PHEV)' },
  { value: 'electric', label: 'Electric', long: 'Fully electric (EV)' },
]

export const powertrainLabel = (value) => {
  const found = powertrains.find((p) => p.value === value)
  return found ? found.label : 'Petrol'
}

//same rule as the backend, empty list means every car needs the item
export const itemFits = (item, powertrain) => {
  return !item.powertrains || item.powertrains.length === 0 || item.powertrains.includes(powertrain || 'petrol')
}
