import axios from 'axios'
import { store } from './store'
import { logout } from './store/authSlice'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

//attach the token to every request
api.interceptors.request.use((config) => {
  const token = store.getState().auth.token
  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
})

//token expired or invalid, log out so the user lands on the login page
//only when we sent a token, a wrong password on the login form is also a 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const hadToken = !!err.config?.headers?.Authorization
    if (err.response?.status === 401 && hadToken) {
      store.dispatch(logout())
    }
    return Promise.reject(err)
  }
)

//turns an axios error into { message, errors } so forms can show it
export const readError = (err) => {
  if (!err.response) {
    return { message: 'Cannot reach the server. Check your connection and try again.', errors: {} }
  }
  const data = err.response.data || {}
  return { message: data.message || 'Something went wrong.', errors: data.errors || {} }
}

export default api
