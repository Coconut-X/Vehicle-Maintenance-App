import { createSlice } from '@reduxjs/toolkit'

//read what we saved last time so refresh does not log the user out
const loadSaved = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('carvault_auth'))
    if (saved && saved.token) return saved
  } catch {
    //bad json in storage, just start logged out
  }
  return { user: null, token: null }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadSaved(),
  reducers: {
    loginSuccess(state, action) {
      state.user = action.payload.user
      state.token = action.payload.token
    },
    setUser(state, action) {
      state.user = action.payload
    },
    logout(state) {
      state.user = null
      state.token = null
    },
  },
})

export const { loginSuccess, setUser, logout } = authSlice.actions
export default authSlice.reducer
