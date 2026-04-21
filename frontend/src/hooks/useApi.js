import { useState, useCallback } from 'react'
import axios from 'axios'


const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL: BASE_URL, timeout: 300000 })



export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const call = useCallback(async (method, url, data = null, config = {}) => {
    setLoading(true); setError(null)
    try {
      const res = await api({ method, url, data, ...config })
      return res.data
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erreur inconnue'
      setError(msg); throw new Error(msg)
    } finally { setLoading(false) }
  }, [])

  return {
    get:     useCallback((url, cfg)        => call('GET',    url, null, cfg), [call]),
    post:    useCallback((url, data, cfg)  => call('POST',   url, data, cfg), [call]),
    put:     useCallback((url, data)       => call('PUT',    url, data),      [call]),
    del:     useCallback((url)             => call('DELETE', url),            [call]),
    loading, error, setError
  }
}

export default api
