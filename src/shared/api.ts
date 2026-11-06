const API_BASE = '/api'

function getStoredToken(): string | null {
  return localStorage.getItem('wayfarer_jwt_token')
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: any
    headers?: Record<string, string>
    idempotencyKey?: string
  } = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, idempotencyKey } = options
  const token = getStoredToken()

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`
  }
  if (idempotencyKey) {
    reqHeaders['Idempotency-Key'] = idempotencyKey
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  try {
    const response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    const contentType = response.headers.get('content-type')
    const isJson = contentType && contentType.includes('application/json')
    const data = isJson ? await response.json() : await response.text()

    if (!response.ok) {
      const errorMsg = (typeof data === 'object' && data?.detail) || data?.message || `Request failed (${response.status})`
      throw new Error(errorMsg)
    }

    return data as T
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network unavailable. You are currently browsing in offline mode.')
    }
    throw error
  }
}

