import axios from 'axios'

// In development, use relative URLs so Vite proxy handles them
// In production, use root path (Express serves the app)
const baseURL = import.meta.env.PROD ? '' : ''

export const api = axios.create({
  baseURL,
  withCredentials: true,
})

export default api
