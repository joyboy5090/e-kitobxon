export async function apiRequest(path, { method = 'GET', body, csrfToken } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    headers['X-Kitobxon-Request'] = '1'
    headers['X-CSRF-Token'] = csrfToken || ''
  }
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'So‘rovni bajarib bo‘lmadi.')
  return data
}
