const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const TOKEN_KEY = 'task-app-token'

export function readToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function saveToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

function getAuthHeaders(extraHeaders = {}) {
  const token = readToken()
  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function registerUser(email, password) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || 'Unable to register')
  return payload
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || 'Unable to login')
  return payload
}

export async function getCurrentUser() {
  const response = await fetch(`${API_URL}/me`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Unauthorized')
  return response.json()
}

export async function getTasks() {
  const response = await fetch(`${API_URL}/tasks`, { headers: getAuthHeaders() })
  if (!response.ok) throw new Error('Unable to load tasks')
  return response.json()
}

export async function createTask(task) {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(task),
  })
  if (!response.ok) throw new Error('Unable to create task')
  return response.json()
}

export async function updateTask(id, updates) {
  const response = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(updates),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || 'Unable to update task')
  return payload
}

export async function deleteTask(id) {
  const response = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error('Unable to delete task')
}
