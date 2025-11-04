// API Configuration
// Use environment variable or default to localhost for development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

// Helper functions
export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
}

export const getWsUrl = (endpoint) => {
  const wsProtocol = WS_BASE_URL.startsWith('wss://') ? 'wss://' : 'ws://'
  const baseUrl = WS_BASE_URL.replace(/^wss?:\/\//, '')
  return `${wsProtocol}${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
}

