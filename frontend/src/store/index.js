import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
})

//keep the login in localStorage so it survives a page refresh
store.subscribe(() => {
  const { user, token } = store.getState().auth
  try {
    if (token) {
      localStorage.setItem('carvault_auth', JSON.stringify({ user, token }))
    } else {
      localStorage.removeItem('carvault_auth')
    }
  } catch {
    //storage can be blocked, app still works until refresh
  }
})
