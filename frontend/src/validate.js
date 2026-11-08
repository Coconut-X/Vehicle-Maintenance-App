//same rules as the backend so people see mistakes before sending
//the server checks everything again, this is only for faster feedback
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validateLogin = (form) => {
  const errors = {}
  if (!emailRegex.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (!form.password) errors.password = 'Enter your password.'
  return errors
}

//emails typed one on each line or split by commas or spaces, lowercase and without repeats
export const parseEmails = (text) => {
  const seen = new Set()
  const valid = []
  const invalid = []
  text
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .forEach((e) => {
      if (seen.has(e)) return
      seen.add(e)
      ;(emailRegex.test(e) ? valid : invalid).push(e)
    })
  return { valid, invalid }
}

export const validateForgot = (form) => {
  const errors = {}
  if (!emailRegex.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  return errors
}

export const validateReset = (form) => {
  const errors = {}
  if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
    errors.password = 'Use at least 8 characters with a letter and a number.'
  }
  if (form.confirm !== form.password) errors.confirm = 'The two passwords are not the same.'
  return errors
}

export const validateRegister = (form) => {
  const errors = {}
  const name = form.name.trim()

  if (name.length < 2 || name.length > 60) errors.name = 'Name must be 2 to 60 characters.'
  if (!emailRegex.test(form.email.trim())) errors.email = 'Enter a valid email address.'

  if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
    errors.password = 'Use at least 8 characters with a letter and a number.'
  }

  if (form.defaultMonthlyKm !== '') {
    const km = Number(form.defaultMonthlyKm)
    if (!Number.isInteger(km) || km < 0 || km > 20000) {
      errors.defaultMonthlyKm = 'Enter a whole number from 0 to 20000.'
    }
  }

  return errors
}

const photoTypes = ['image/jpeg', 'image/png', 'image/webp']

export const validateVehicle = (form, photo) => {
  const errors = {}
  const maxYear = new Date().getFullYear() + 1
  const isWhole = (value, min, max) => {
    const n = Number(value)
    return value !== '' && Number.isInteger(n) && n >= min && n <= max
  }

  if (form.make.trim().length < 1 || form.make.trim().length > 40) errors.make = 'Make must be 1 to 40 characters.'
  if (form.model.trim().length < 1 || form.model.trim().length > 40) errors.model = 'Model must be 1 to 40 characters.'
  if (!isWhole(form.year, 1950, maxYear)) errors.year = 'Year must be between 1950 and ' + maxYear + '.'

  const reg = form.registrationNo.trim()
  if (reg.length < 1 || reg.length > 20) errors.registrationNo = 'Registration number must be 1 to 20 characters.'

  if (form.nickname.trim().length > 40) errors.nickname = 'Nickname can be at most 40 characters.'

  if (!isWhole(form.odometerKm, 0, 2000000)) errors.odometerKm = 'Enter a whole number from 0 to 2,000,000.'
  if (form.avgMonthlyKm !== '' && !isWhole(form.avgMonthlyKm, 0, 20000)) {
    errors.avgMonthlyKm = 'Enter a whole number from 0 to 20,000.'
  }

  if (photo) {
    if (!photoTypes.includes(photo.type)) errors.photo = 'Photo must be a jpg, png or webp image.'
    else if (photo.size > 5 * 1024 * 1024) errors.photo = 'Photo must be 5MB or less.'
  }

  return errors
}

const receiptTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export const validateService = (form, receipt) => {
  const errors = {}

  if (!form.item) errors.item = 'Choose what was done.'

  if (!form.serviceDate || isNaN(new Date(form.serviceDate).getTime())) {
    errors.serviceDate = 'Enter the date of the service.'
  } else if (new Date(form.serviceDate) > new Date()) {
    errors.serviceDate = 'The date cannot be in the future.'
  }

  //optional, an empty reading is estimated from the date by the server
  if (form.odometerKm !== '') {
    const km = Number(form.odometerKm)
    if (!Number.isInteger(km) || km < 0 || km > 2000000) {
      errors.odometerKm = 'Enter a whole number from 0 to 2,000,000, or leave it empty.'
    }
  }

  if (form.cost !== '') {
    const cost = Number(form.cost)
    if (isNaN(cost) || cost < 0 || cost > 10000000) errors.cost = 'Enter an amount from 0 to 10,000,000.'
  }

  if (form.workshop.length > 80) errors.workshop = 'Workshop can be at most 80 characters.'
  if (form.notes.length > 1000) errors.notes = 'Notes can be at most 1000 characters.'

  if (receipt) {
    if (!receiptTypes.includes(receipt.type)) errors.receipt = 'Receipt must be a jpg, png, webp or pdf file.'
    else if (receipt.size > 5 * 1024 * 1024) errors.receipt = 'Receipt must be 5MB or less.'
  }

  return errors
}
