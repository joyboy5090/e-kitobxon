import test from 'node:test'
import assert from 'node:assert/strict'
import { apiRequest } from '../src/components/common/api.js'

test('apiRequest automatically sets Content-Type and empty JSON body on non-GET requests without body', async () => {
  let capturedHeaders = {}
  let capturedBody = null
  let capturedMethod = null

  // Global fetch ni mock qilamiz
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    capturedMethod = options.method
    capturedHeaders = options.headers
    capturedBody = options.body
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    }
  }

  try {
    await apiRequest('/api/test', { method: 'DELETE' })
    assert.equal(capturedMethod, 'DELETE')
    assert.equal(capturedHeaders['Content-Type'], 'application/json')
    assert.equal(capturedHeaders['X-Kitobxon-Request'], '1')
    assert.equal(capturedBody, '{}')

    await apiRequest('/api/test2', { method: 'POST' })
    assert.equal(capturedMethod, 'POST')
    assert.equal(capturedHeaders['Content-Type'], 'application/json')
    assert.equal(capturedHeaders['X-Kitobxon-Request'], '1')
    assert.equal(capturedBody, '{}')

    await apiRequest('/api/test-get', { method: 'GET' })
    assert.equal(capturedMethod, 'GET')
    assert.equal(capturedHeaders['Content-Type'], undefined)
    assert.equal(capturedHeaders['X-Kitobxon-Request'], undefined)
    assert.equal(capturedBody, undefined)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('error handler logic accurately preserves 4xx status and produces friendly error message', () => {
  function handleExpressError(error) {
    let statusCode = 500
    let payload = { error: 'Serverda xatolik yuz berdi. Birozdan so‘ng qayta urinib ko‘ring.' }

    const status = Number(error.status || error.statusCode)
    if (status >= 400 && status < 500) {
      statusCode = status
      if (error.type === 'entity.too.large') {
        payload = { error: 'Yuborilgan ma’lumot hajmi juda katta (maksimal 20 KB).' }
      } else if (error.type === 'entity.parse.failed') {
        payload = { error: 'Yuborilgan JSON formati noto‘g‘ri.' }
      } else {
        payload = { error: error.message || 'Noto‘g‘ri so‘rov yuborildi.' }
      }
    }
    return { statusCode, payload }
  }

  // 1. entity.too.large (413)
  const tooLargeRes = handleExpressError({ status: 413, type: 'entity.too.large' })
  assert.equal(tooLargeRes.statusCode, 413)
  assert.ok(tooLargeRes.payload.error.includes('katta'))

  // 2. entity.parse.failed (400)
  const parseFailedRes = handleExpressError({ status: 400, type: 'entity.parse.failed' })
  assert.equal(parseFailedRes.statusCode, 400)
  assert.ok(parseFailedRes.payload.error.includes('noto‘g‘ri'))

  // 3. Server error 500
  const serverErrorRes = handleExpressError({ status: 500, message: 'DB connection failure' })
  assert.equal(serverErrorRes.statusCode, 500)
  assert.equal(serverErrorRes.payload.error, 'Serverda xatolik yuz berdi. Birozdan so‘ng qayta urinib ko‘ring.')
})
