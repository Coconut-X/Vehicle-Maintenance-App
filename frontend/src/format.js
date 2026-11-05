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
