import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import api from './api'
import { setUser } from './store/authSlice'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Garage from './pages/Garage'
import VehicleForm from './pages/VehicleForm'
import VehicleDetail from './pages/VehicleDetail'
import LogService from './pages/LogService'
import History from './pages/History'
import NotFound from './pages/NotFound'

function App() {
  const token = useSelector((state) => state.auth.token)
  const dispatch = useDispatch()

  //check the saved token still works and refresh the user details
  //if it expired the api file logs the user out
  useEffect(() => {
    if (!token) return
    api
      .get('/auth/me')
      .then((res) => dispatch(setUser(res.data.user)))
      .catch(() => {})
  }, [token, dispatch])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/garage" element={<Garage />} />
            <Route path="/vehicles/new" element={<VehicleForm />} />
            <Route path="/vehicles/:id" element={<VehicleDetail />} />
            <Route path="/vehicles/:id/edit" element={<VehicleForm />} />
            <Route path="/vehicles/:id/log" element={<LogService />} />
            <Route path="/history" element={<History />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
