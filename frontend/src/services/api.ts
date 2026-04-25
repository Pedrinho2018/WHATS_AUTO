import axios from 'axios'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { appConfig } from '../config/runtime'

type DebugAxiosRequestConfig = InternalAxiosRequestConfig & {
  metadata?: {
    startedAt: number
  }
}

const isApiDebugEnabled = appConfig.debugApi

const api = axios.create({
  baseURL: appConfig.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const debugConfig = config as DebugAxiosRequestConfig
    debugConfig.metadata = { startedAt: performance.now() }

    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (isApiDebugEnabled) {
      console.debug('[API] request', {
        method: config.method?.toUpperCase(),
        url: config.url,
      })
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    if (isApiDebugEnabled) {
      const config = response.config as DebugAxiosRequestConfig
      const elapsed = config.metadata ? Math.round(performance.now() - config.metadata.startedAt) : undefined

      console.debug('[API] response', {
        method: response.config.method?.toUpperCase(),
        url: response.config.url,
        status: response.status,
        elapsedMs: elapsed,
      })
    }

    return response
  },
  (error: AxiosError) => {
    if (isApiDebugEnabled) {
      const config = error.config as DebugAxiosRequestConfig | undefined
      const elapsed = config?.metadata ? Math.round(performance.now() - config.metadata.startedAt) : undefined

      console.debug('[API] error', {
        method: config?.method?.toUpperCase(),
        url: config?.url,
        status: error.response?.status,
        elapsedMs: elapsed,
        message: error.message,
      })
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
