import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'

// Em dev: usa o proxy do Vite (`/api` → http://localhost:3334)
// Em prod: VITE_API_URL aponta para a URL pública da API (definida no Render)
const baseURL = (import.meta.env.VITE_API_URL as string | undefined) || '/api'

export const api = axios.create({
  baseURL,
  withCredentials: true, // cookies httponly do refresh
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Renovação automática de access token quando expira.
let refreshing: Promise<string | null> | null = null

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshing) {
          refreshing = api.post('/auth/refresh').then(r => r.data.accessToken).catch(() => null)
        }
        const newToken = await refreshing
        refreshing = null
        if (newToken) {
          useAuthStore.getState().setAccessToken(newToken)
          original.headers.Authorization = `Bearer ${newToken}`
          return api(original)
        }
      } catch {
        // cai pra clearAuth abaixo
      }
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
