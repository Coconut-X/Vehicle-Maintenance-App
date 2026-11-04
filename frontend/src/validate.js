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
