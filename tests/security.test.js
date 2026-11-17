import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { safeNextPath } from '../src/components/common/urlUtils.js'
import { isSafeHttpUrl, UUID_REGEX, ADSENSE_ID_REGEX } from '../server/adRoutes.js'
import { encryptBackupBuffer, decryptBackupBuffer } from '../server/backup.js'

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

test('isSafeHttpUrl strictly allows only http: and https: protocols', () => {
  assert.equal(isSafeHttpUrl('https://e-kitobxon.uz'), true)
  assert.equal(isSafeHttpUrl('http://example.com/banner.png'), true)
  assert.equal(isSafeHttpUrl('javascript:alert(document.cookie)'), false)
  assert.equal(isSafeHttpUrl('data:text/html,<script>alert(1)</script>'), false)
  assert.equal(isSafeHttpUrl('/relative/path'), false)
  assert.equal(isSafeHttpUrl(''), false)
  assert.equal(isSafeHttpUrl(null), false)
  assert.equal(isSafeHttpUrl('a'.repeat(1005)), false)
})

test('UUID_REGEX strictly validates UUIDv4 format', () => {
  assert.equal(UUID_REGEX.test('e418fd15-0000-4000-8000-000000000000'), true)
  assert.equal(UUID_REGEX.test('not-a-uuid'), false)
  assert.equal(UUID_REGEX.test('12345'), false)
  assert.equal(UUID_REGEX.test("'; DROP TABLE ad_banners; --"), false)
})

test('ADSENSE_ID_REGEX strictly validates publisher IDs', () => {
  assert.equal(ADSENSE_ID_REGEX.test('ca-pub-1115153746763009'), true)
  assert.equal(ADSENSE_ID_REGEX.test('pub-1115153746763009'), true)
  assert.equal(ADSENSE_ID_REGEX.test('pub-12345'), false)
  assert.equal(ADSENSE_ID_REGEX.test('ca-pub-abc'), false)
  assert.equal(ADSENSE_ID_REGEX.test('pub-1115153746763009\r\nX-Injected: header'), false)
})

test('encryptBackupBuffer and decryptBackupBuffer performs authenticated round-trip AES-256-GCM', () => {
  const key = randomBytes(32)
  const original = Buffer.from('{"test":"sensitive database data"}', 'utf-8')
  const encrypted = encryptBackupBuffer(original, key)

  assert.ok(encrypted.subarray(0, 10).toString('utf-8') === 'ENC_GCM_V1', 'Magic header should be present')
  assert.notDeepEqual(encrypted, original, 'Data must be encrypted')

  const decrypted = decryptBackupBuffer(encrypted, key)
  assert.deepEqual(decrypted, original, 'Decrypted data must match original')

  const wrongKey = randomBytes(32)
  assert.throws(() => decryptBackupBuffer(encrypted, wrongKey), /Unsupported state or unable to authenticate data/, 'Wrong key must fail auth tag')
})
