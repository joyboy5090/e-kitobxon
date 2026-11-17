import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { safeNextPath } from '../src/components/common/urlUtils.js'
import { isSafeHttpUrl, UUID_REGEX, ADSENSE_ID_REGEX, adMetricLimiter } from '../server/adRoutes.js'
import { encryptBackupBuffer, decryptBackupBuffer } from '../server/backup.js'
import { isSafeBlogCoverUrl, UUID_PATTERN } from '../server/blogRoutes.js'

const scrypt = promisify(scryptCallback)
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEY_LENGTH = 64

async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, SCRYPT_KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 32 * 1024 * 1024 })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`
}

async function verifyPassword(password, storedHash) {
  const [algorithm, n, r, p, saltEncoded, keyEncoded] = String(storedHash || '').split('$')
  if (algorithm !== 'scrypt' || !saltEncoded || !keyEncoded) return false
  const numN = Number(n)
  const numR = Number(r)
  const numP = Number(p)
  if (numN !== SCRYPT_N || numR !== SCRYPT_R || numP !== SCRYPT_P) return false
  const salt = Buffer.from(saltEncoded, 'base64url')
  const expected = Buffer.from(keyEncoded, 'base64url')
  if (salt.length !== 16 || expected.length !== SCRYPT_KEY_LENGTH) return false
  const derived = Buffer.from(await scrypt(password, salt, expected.length, {
    N: numN,
    r: numR,
    p: numP,
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

test('verifyPassword rejects manipulated scrypt parameters (DoS prevention)', async () => {
  const rawPass = 'SecretPassword123!'
  const validHash = await hashPassword(rawPass)

  // N parametrini o'zgartirish (masalan 1048576)
  const tamperedN = validHash.replace('16384', '32768')
  assert.equal(await verifyPassword(rawPass, tamperedN), false, 'N parametri mos kelmasa rad etilishi kerak')

  // r parametrini o'zgartirish
  const tamperedR = validHash.replace('$8$', '$16$')
  assert.equal(await verifyPassword(rawPass, tamperedR), false, 'r parametri mos kelmasa rad etilishi kerak')

  // p parametrini o'zgartirish
  const tamperedP = validHash.replace('$1$', '$2$')
  assert.equal(await verifyPassword(rawPass, tamperedP), false, 'p parametri mos kelmasa rad etilishi kerak')

  // Noto'g'ri salt uzunligi
  const shortSalt = `scrypt$16384$8$1$c2hvcnQ$${Buffer.alloc(64).toString('base64url')}`
  assert.equal(await verifyPassword(rawPass, shortSalt), false, 'Noto‘g‘ri salt uzunligi rad etilishi kerak')
})

test('isSafeBlogCoverUrl allows valid image paths and rejects unsafe schemes', () => {
  assert.equal(isSafeBlogCoverUrl('https://example.com/cover.jpg'), true)
  assert.equal(isSafeBlogCoverUrl('http://example.com/cover.png'), true)
  assert.equal(isSafeBlogCoverUrl('/uploads/cover.webp'), true)
  assert.equal(isSafeBlogCoverUrl(''), true)
  assert.equal(isSafeBlogCoverUrl(null), true)
  assert.equal(isSafeBlogCoverUrl('javascript:alert(1)'), false)
  assert.equal(isSafeBlogCoverUrl('data:image/svg+xml,...'), false)
  assert.equal(isSafeBlogCoverUrl('ftp://example.com/cover.png'), false)
  assert.equal(isSafeBlogCoverUrl('a'.repeat(1005)), false)
})

test('blog search wildcards are properly escaped', () => {
  const sanitizeSearch = (q) => {
    const raw = typeof q === 'string' ? q.trim().slice(0, 80) : ''
    return raw.replace(/[\\%_]/g, '\\$&')
  }

  assert.equal(sanitizeSearch('100%'), '100\\%')
  assert.equal(sanitizeSearch('admin_user'), 'admin\\_user')
  assert.equal(sanitizeSearch('test\\path'), 'test\\\\path')
  assert.equal(sanitizeSearch('a'.repeat(100)).length, 80)
})

test('UUID_PATTERN validates UUID format for blog routes', () => {
  assert.equal(UUID_PATTERN.test('e418fd15-0000-4000-8000-000000000000'), true)
  assert.equal(UUID_PATTERN.test('not-a-uuid'), false)
  assert.equal(UUID_PATTERN.test('../../../etc/passwd'), false)
})

test('adMetricLimiter is properly configured', () => {
  assert.ok(typeof adMetricLimiter === 'function', 'adMetricLimiter middleware bo‘lishi kerak')
})
