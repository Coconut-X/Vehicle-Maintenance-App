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

//currencies to pick from, same codes as the backend, only a label for the costs
export const currencies = [
  { value: 'PKR', label: 'PKR - Pakistani rupee' },
  { value: 'USD', label: 'USD - US dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British pound' },
  { value: 'AED', label: 'AED - UAE dirham' },
  { value: 'SAR', label: 'SAR - Saudi riyal' },
  { value: 'QAR', label: 'QAR - Qatari riyal' },
  { value: 'KWD', label: 'KWD - Kuwaiti dinar' },
  { value: 'OMR', label: 'OMR - Omani rial' },
  { value: 'BHD', label: 'BHD - Bahraini dinar' },
  { value: 'INR', label: 'INR - Indian rupee' },
  { value: 'BDT', label: 'BDT - Bangladeshi taka' },
  { value: 'CAD', label: 'CAD - Canadian dollar' },
  { value: 'AUD', label: 'AUD - Australian dollar' },
  { value: 'CNY', label: 'CNY - Chinese yuan' },
  { value: 'TRY', label: 'TRY - Turkish lira' },
  { value: 'MYR', label: 'MYR - Malaysian ringgit' },
  { value: 'SGD', label: 'SGD - Singapore dollar' },
]

//cost with the currency code in front when there is one, up to 2 decimals
export const formatMoney = (amount, currency) => {
  if (amount === null || amount === undefined) return '-'
  const number = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return currency ? currency + ' ' + number : number
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
