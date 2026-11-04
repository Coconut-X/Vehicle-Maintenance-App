//same rules as the backend so people see mistakes before sending
//the server checks everything again, this is only for faster feedback
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validateLogin = (form) => {
  const errors = {}
  if (!emailRegex.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (!form.password) errors.password = 'Enter your password.'
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
