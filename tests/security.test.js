import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { safeNextPath } from '../src/components/common/urlUtils.js'

const scrypt = promisify(scryptCallback)

async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 })
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`
}

async function verifyPassword(password, storedHash) {
  const [algorithm, n, r, p, saltEncoded, keyEncoded] = String(storedHash || '').split('$')
  if (algorithm !== 'scrypt' || !saltEncoded || !keyEncoded) return false
  const salt = Buffer.from(saltEncoded, 'base64url')
  const expected = Buffer.from(keyEncoded, 'base64url')
  if (expected.length !== 64) return false
  const derived = Buffer.from(await scrypt(password, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 32 * 1024 * 1024,
  }))
  return timingSafeEqual(derived, expected)
}

test('scrypt password hash and verification works accurately', async () => {
  const rawPass = 'SecretPassword123!'
  const hash = await hashPassword(rawPass)
  assert.ok(hash.startsWith('scrypt$16384$8$1$'), 'Scrypt formati to‘g‘ri bo‘lishi kerak')
  assert.equal(await verifyPassword(rawPass, hash), true, 'To‘g‘ri parol tasdiqlanishi kerak')
  assert.equal(await verifyPassword('WrongPassword', hash), false, 'Noto‘g‘ri parol rad etilishi kerak')
})

test('safeNextPath sanitizes redirect targets against Open-Redirect attacks', () => {
  assert.equal(safeNextPath('/admin'), '/admin', 'Ichki yo‘l qabul qilinadi')
  assert.equal(safeNextPath('/books/123'), '/books/123', 'Ichki yo‘l qabul qilinadi')
  assert.equal(safeNextPath('https://evil.com'), '/', 'Tashqi havola bloklanadi')
  assert.equal(safeNextPath('//evil.com'), '/', 'Protokolsiz tashqi havola bloklanadi')
  assert.equal(safeNextPath('\\evil.com'), '/', 'Backslash hiylasi bloklanadi')
  assert.equal(safeNextPath('javascript:alert(1)'), '/', 'Xavfli sxema bloklanadi')
  assert.equal(safeNextPath(null), '/', 'Null qiymat bosh sahifaga yo‘naltiriladi')
})
