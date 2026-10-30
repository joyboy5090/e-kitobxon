export async function apiRequest(path, { method = 'GET', body, csrfToken } = {}) {
  const headers = { Accept: 'application/json' }
  const isMutation = method !== 'GET'
  if (isMutation || body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (isMutation) {
    headers['X-Kitobxon-Request'] = '1'
    headers['X-CSRF-Token'] = csrfToken || ''
  }
  const payload = body !== undefined ? body : (isMutation ? {} : undefined)
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers,
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
  })
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'So‘rovni bajarib bo‘lmadi.')
  return data
}
