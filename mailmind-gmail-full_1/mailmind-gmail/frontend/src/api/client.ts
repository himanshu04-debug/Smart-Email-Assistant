import axios, { AxiosError } from 'axios'

const BASE = '/api'

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

// ── Attach access token ───────────────────────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  // Inject X-User-Id for controllers that need it directly
  const userId = localStorage.getItem('userId')
  if (userId) config.headers['X-User-Id'] = userId
  return config
})

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!))
  failedQueue = []
}

api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const orig = error.config as any
    if (error.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          orig.headers['Authorization'] = `Bearer ${token}`
          return api(orig)
        })
      }
      orig._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        isRefreshing = false
        window.location.href = '/'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken })
        localStorage.setItem('accessToken',  data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        processQueue(null, data.accessToken)
        orig.headers['Authorization'] = `Bearer ${data.accessToken}`
        return api(orig)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.clear()
        window.location.href = '/'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api
