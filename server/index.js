import { createServer as createHttpServer } from 'node:http'
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import multer from 'multer'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import pg from 'pg'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { LocalStorageClient } from './localStorage.js'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { createServer as createViteServer } from 'vite'
import { books } from '../src/catalog.js'
import { registerAdminRoutes, logAdminAction } from './adminRoutes.js'
import { registerSupportRoutes } from './supportRoutes.js'
import { registerAdRoutes } from './adRoutes.js'
import { registerBlogRoutes } from './blogRoutes.js'
import { notifyNewUser, notifyNewReview } from './telegram.js'
import { generateCaptcha, verifyCaptcha } from './captcha.js'
import { startAutoBackupScheduler } from './backup.js'

const { Pool } = pg
const scrypt = promisify(scryptCallback)
const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const port = Number(process.env.PORT || 5000)
const sessionSecret = process.env.SESSION_SECRET
const objectStorage = new LocalStorageClient()
const staticBookById = new Map(books.map((book) => [book.id, book]))
const usernamePattern = /^[a-zA-Z0-9_]{3,24}$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const coverPalettes = [
  ['#855852', '#c39b76'],
  ['#566d65', '#c5a977'],
  ['#58627b', '#d0ae7e'],
  ['#9b704d', '#e0bd82'],
]

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to start Kitobxon.')
if (!sessionSecret) throw new Error('SESSION_SECRET is required to start Kitobxon.')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const PgSessionStore = connectPgSimple(session)
const bookIds = new Set(books.map((book) => book.id))
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEY_LENGTH = 64
const MAX_PASSWORD_BYTES = 128
let dummyPasswordHash

const app = express()
const server = createHttpServer(app)
let viteServer = null

app.set('trust proxy', 1)
app.disable('x-powered-by')

const isProd = process.env.NODE_ENV === 'production'
app.use(helmet({
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://pagead2.googlesyndication.com", "https://partner.googleadservices.com", "https://tpc.googlesyndication.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://pagead2.googlesyndication.com", "https://ep1.adtrafficquality.google"],
      frameSrc: ["'self'", "https://googleads.g.doubleclick.net", "https://tpc.googlesyndication.com", "https://www.google.com"],
      workerSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  } : false,
  frameguard: { action: 'sameorigin' },
}))

// Blog maqolalari (matn va rasmlar) uchun alohida 500kb limit
const blogJsonParser = express.json({ limit: '500kb' })
const defaultJsonParser = express.json({ limit: '20kb' })
app.use((req, res, next) => {
  if (req.path.startsWith('/api/admin/blog')) {
    return blogJsonParser(req, res, next)
  }
  return defaultJsonParser(req, res, next)
})
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const pdfUpload = req.method === 'POST'
      && req.path === '/api/admin/books'
      && req.is('multipart/form-data')
    if (req.get('x-kitobxon-request') !== '1' || (!req.is('application/json') && !pdfUpload)) {
      return res.status(403).json({ error: 'So‘rovni tekshirishdan o‘tkazib bo‘lmadi.' })
    }
  }
  next()
})
app.use(session({
  name: 'kitobxon.sid',
  store: new PgSessionStore({
    pool,
    tableName: 'kitobxon_sessions',
    createTableIfMissing: false,
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  },
}))

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Urinishlar soni ko‘payib ketdi. Birozdan so‘ng yana urinib ko‘ring.' },
})
const meRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})
const captchaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Juda ko‘p so‘rov yuborildi. Biroz kuting.' },
})
const pdfDownloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120, // 15 daqiqada 120 ta PDF/sahifa yuklash
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Juda ko‘p kitob varaqladingiz. Birozdan so‘ng davom eting.' },
})
const adminWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Kitob yuklash uchun soatlik limitga yetdingiz.' },
})
const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Juda ko‘p sharh yuborildi. Birozdan so‘ng yana urinib ko‘ring.' },
})
const readEventLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')
    callback(isPdf ? null : new Error('PDF formatidagi fayl yuklang.'), isPdf)
  },
})

function parsePdfUpload(req, res, next) {
  pdfUpload.single('pdf')(req, res, (error) => {
    if (!error) return next()
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'PDF hajmi 50 MB dan oshmasligi kerak.' })
    }
    return res.status(400).json({ error: error.message || 'PDF faylni qabul qilib bo‘lmadi.' })
  })
}

function derivePasswordHash(password, salt) {
  return scrypt(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 32 * 1024 * 1024,
  })
}

async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await derivePasswordHash(password, salt)
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`
}

async function verifyPassword(password, storedHash) {
  try {
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
    return timingSafeEqual(expected, derived)
  } catch {
    return false
  }
}

function newCsrfToken() {
  return randomBytes(32).toString('base64url')
}

function safeEqualText(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function requireCsrf(req, res, next) {
  if (!safeEqualText(req.session?.csrfToken, req.get('x-csrf-token'))) {
    return res.status(403).json({ error: 'Sahifa yangilandi. Iltimos, qayta urinib ko‘ring.' })
  }
  next()
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve())
  })
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve())
  })
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => error ? reject(error) : resolve())
  })
}

async function beginUserSession(req, user) {
  await regenerateSession(req)
  req.session.userId = user.id
  req.session.csrfToken = newCsrfToken()
  await saveSession(req)
  return { id: user.id, username: user.username, email: user.email, role: user.role, gender: user.gender, csrfToken: req.session.csrfToken }
}

function mapDynamicBook(row, index = 0, ratingData = null) {
  const [color, accent] = coverPalettes[index % coverPalettes.length]
  const avgRating = ratingData?.average !== undefined ? Number(ratingData.average) : (row.avg_rating !== undefined ? Number(row.avg_rating) : null)
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    published: String(row.published_year),
    publishedYear: row.published_year,
    genre: row.genre,
    group: row.genre,
    categories: [row.genre],
    rating: avgRating && avgRating > 0 ? avgRating.toFixed(1) : '—',
    ratingValue: avgRating && avgRating > 0 ? avgRating : 0,
    reviewsCount: Number(ratingData?.count ?? row.reviews_count ?? 0),
    pages: row.page_count,
    pageCount: row.page_count,
    color,
    accent,
    description: row.description,
    language: row.language,
    hasPdf: true,
  }
}

async function getDynamicBook(bookId) {
  const { rows } = await pool.query('SELECT * FROM library_books WHERE id = $1', [bookId])
  return rows[0] || null
}

async function bookExists(bookId) {
  if (staticBookById.has(bookId)) return true
  return Boolean(await getDynamicBook(bookId))
}

function extractPageText(items) {
  const rawLines = []
  let line = ''
  for (const item of items) {
    const text = typeof item.str === 'string' ? item.str.replace(/\s+/g, ' ').trim() : ''
    if (text) line += `${line ? ' ' : ''}${text}`
    if (item.hasEOL && line) {
      rawLines.push(line)
      line = ''
    }
  }
  if (line) rawLines.push(line)

  // Qatorlarni mantiqiy xatboshilarga birlashtirish
  const paragraphs = []
  let currentPara = ''

  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i].trim()
    if (!l) {
      if (currentPara) {
        paragraphs.push(currentPara)
        currentPara = ''
      }
      continue
    }

    if (!currentPara) {
      currentPara = l
    } else {
      // Agar oldingi qator defis bilan tugagan bo'lsa (so'z ko'chirish)
      if (currentPara.endsWith('-')) {
        currentPara = currentPara.slice(0, -1) + l
      } else if (/[.!?:;»"]$/.test(currentPara) && /^[A-ZА-ЯЁЎҚҒҲ0-9]/.test(l)) {
        // Gap tugagan va yangi gap bosh harf bilan boshlansa yangi xatboshi bo'lishi mumkin
        paragraphs.push(currentPara)
        currentPara = l
      } else {
        currentPara += ' ' + l
      }
    }
  }

  if (currentPara) paragraphs.push(currentPara)
  return paragraphs.join('\n\n').trim()
}

async function extractPdfPages(buffer) {
  const task = getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true,
  })
  const document = await task.promise
  try {
    if (document.numPages < 1 || document.numPages > 1500) {
      throw new Error('PDFdagi betlar soni 1–1500 oralig‘ida bo‘lishi kerak.')
    }
    const pages = []
    let totalCharacters = 0
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const text = extractPageText(textContent.items || [])
      totalCharacters += text.length
      if (totalCharacters > 20_000_000) {
        throw new Error('PDF matni hajmi ruxsat etilgan chegaradan oshdi.')
      }
      pages.push(text)
    }
    if (!pages.some((text) => text.length > 0)) {
      throw new Error('PDFda ajratib olinadigan matn topilmadi. Skanerlangan kitoblar hozircha qo‘llanmaydi.')
    }
    return pages
  } finally {
    await document.destroy()
  }
}

function createBookId(title) {
  const slug = title.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72) || 'kitob'
  return `${slug}-${randomBytes(4).toString('hex')}`
}

async function provisionAdminFromSecrets() {
  const username = process.env.ADMIN_USERNAME?.trim()
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const configured = [username, email, password].filter(Boolean).length
  if (!configured) return
  if (configured !== 3) {
    throw new Error('Admin akkaunti uchun barcha ADMIN_* sozlamalarini kiriting.')
  }
  if (!usernamePattern.test(username) || !emailPattern.test(email)
    || !['gmail.com', 'googlemail.com'].includes(email.split('@').at(-1))
    || Buffer.byteLength(password, 'utf8') < 8
    || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    throw new Error('Admin akkaunti sozlamalari talabga mos emas.')
  }

  const existing = await pool.query(
    'SELECT id, role FROM kitobxon_users WHERE lower(username) = lower($1)',
    [username],
  )
  if (existing.rows[0]) {
    if (existing.rows[0].role !== 'admin') {
      throw new Error('Admin username oddiy akkauntda band. Boshqa username tanlang.')
    }
    return
  }
  const emailOwner = await pool.query(
    'SELECT id FROM kitobxon_users WHERE lower(email) = lower($1)',
    [email],
  )
  if (emailOwner.rows[0]) {
    throw new Error('Admin Gmail boshqa akkauntda ishlatilgan. Boshqa Gmail tanlang.')
  }

  await pool.query(
    `INSERT INTO kitobxon_users (id, username, email, password_hash, gender, role)
     VALUES ($1, $2, $3, $4, 'undisclosed', 'admin')`,
    [randomUUID(), username, email, await hashPassword(password)],
  )
}

async function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Bu bo‘lim faqat admin uchun.' })
  next()
}

async function requireUser(req, res, next) {
  const userId = req.session?.userId
  if (!userId) return res.status(401).json({ error: 'Bu amal uchun akkauntga kiring.' })
  try {
    const { rows } = await pool.query(
      'SELECT id, username, email, role, gender, is_blocked FROM kitobxon_users WHERE id = $1',
      [userId],
    )
    if (!rows[0]) {
      await destroySession(req)
      return res.status(401).json({ error: 'Akkaunt topilmadi. Qayta kiring.' })
    }
    if (rows[0].is_blocked) {
      await destroySession(req)
      return res.status(403).json({ error: 'Akkauntingiz bloklangan.' })
    }
    req.user = rows[0]
    next()
  } catch (error) {
    next(error)
  }
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1')
  res.json({ ok: true })
}))

app.get('/api/books', asyncRoute(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT b.id, b.title, b.author, b.published_year, b.genre, b.description, b.language, b.page_count,
            COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
            COUNT(r.id)::int AS reviews_count
     FROM library_books b
     LEFT JOIN book_reviews r ON r.book_id = b.id
     GROUP BY b.id
     ORDER BY b.created_at DESC`,
  )
  res.json({ books: rows.map((row, index) => mapDynamicBook(row, index)) })
}))

app.get('/api/books/:bookId', asyncRoute(async (req, res) => {
  const staticBook = staticBookById.get(req.params.bookId)
  if (staticBook) {
    const { chapters, ...metadata } = staticBook
    return res.json({ book: {
      ...metadata,
      language: 'O‘zbekcha',
      pageCount: chapters.length,
      hasPdf: false,
    } })
  }
  const { rows } = await pool.query(
    `SELECT b.*,
            COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
            COUNT(r.id)::int AS reviews_count
     FROM library_books b
     LEFT JOIN book_reviews r ON r.book_id = b.id
     WHERE b.id = $1
     GROUP BY b.id`,
    [req.params.bookId],
  )
  const row = rows[0]
  if (!row) return res.status(404).json({ error: 'Kitob topilmadi.' })
  res.json({ book: mapDynamicBook(row) })
}))

// Asl PDF faylni (faqat kirgan foydalanuvchiga) beradi. sendFile Range so'rovlarini
// qo'llab-quvvatlaydi, shuning uchun brauzer faqat kerakli betlarni yuklab oladi.
app.get('/api/books/:bookId/file', requireUser, pdfDownloadLimiter, asyncRoute(async (req, res) => {
  const row = await getDynamicBook(req.params.bookId)
  if (!row) return res.status(404).json({ error: 'PDF kitob topilmadi.' })
  let filePath
  try {
    filePath = objectStorage.resolvePath(row.storage_key)
  } catch {
    return res.status(404).json({ error: 'PDF fayli topilmadi.' })
  }
  res.set({
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  })
  res.sendFile(filePath, { dotfiles: 'deny' }, (error) => {
    if (error && !res.headersSent) {
      res.status(error.code === 'ENOENT' ? 404 : 500).json({ error: 'PDF fayli topilmadi.' })
    }
  })
}))

app.get('/api/books/:bookId/pages/:pageNumber', requireUser, asyncRoute(async (req, res) => {
  const row = await getDynamicBook(req.params.bookId)
  if (!row) return res.status(404).json({ error: 'PDF kitob topilmadi.' })
  const pageNumber = Number(req.params.pageNumber)
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > row.page_count) {
    return res.status(404).json({ error: 'Kitobning bunday beti yo‘q.' })
  }
  const page = await pool.query(
    'SELECT content_text FROM book_pages WHERE book_id = $1 AND page_number = $2',
    [row.id, pageNumber],
  )
  if (!page.rows[0]) return res.status(404).json({ error: 'Bet matni topilmadi.' })
  res.json({ bookId: row.id, pageNumber, pageCount: row.page_count, content: page.rows[0].content_text })
}))

app.post('/api/books/:bookId/read-events', readEventLimiter, requireCsrf, requireUser, asyncRoute(async (req, res) => {
  const dynamic = await getDynamicBook(req.params.bookId)
  const staticBook = staticBookById.get(req.params.bookId)
  if (!dynamic && !staticBook) return res.status(404).json({ error: 'Kitob topilmadi.' })
  const pageNumber = Number(req.body?.pageNumber)
  const pageCount = dynamic?.page_count || staticBook.chapters.length
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) {
    return res.status(400).json({ error: 'Bet raqami noto‘g‘ri.' })
  }
  const genre = dynamic?.genre || staticBook.genre
  await pool.query(
    `INSERT INTO book_reading_events (user_id, book_id, genre, page_number, read_on)
     VALUES ($1, $2, $3, $4, CURRENT_DATE)
     ON CONFLICT (user_id, book_id, page_number, read_on) DO NOTHING`,
    [req.user.id, req.params.bookId, genre, pageNumber],
  )
  res.status(201).json({ recorded: true })
}))

app.get('/api/admin/stats', requireUser, requireAdmin, asyncRoute(async (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : new Date().toISOString().slice(0, 7)
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month)
  if (!match) return res.status(400).json({ error: 'Oy formati YYYY-MM bo‘lishi kerak.' })
  const startDate = `${month}-01`
  const endDate = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1)).toISOString().slice(0, 10)
  const [accountsResult, readingResult, registrationResult, reviewResult, genreResult, bookResult, dynamicBooksResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE gender = 'female')::int AS female,
              COUNT(*) FILTER (WHERE gender = 'male')::int AS male,
              COUNT(*) FILTER (WHERE gender = 'undisclosed')::int AS undisclosed
       FROM kitobxon_users WHERE role = 'user'`,
    ),
    pool.query(
      `SELECT COUNT(*)::int AS page_reads,
              COUNT(DISTINCT user_id)::int AS readers,
              COUNT(DISTINCT book_id)::int AS books
       FROM book_reading_events WHERE read_on >= $1::date AND read_on < $2::date`,
      [startDate, endDate],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM kitobxon_users
       WHERE role = 'user' AND created_at >= $1::date AND created_at < $2::date`,
      [startDate, endDate],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM book_reviews
       WHERE created_at >= $1::date AND created_at < $2::date`,
      [startDate, endDate],
    ),
    pool.query(
      `SELECT genre, COUNT(*)::int AS page_reads,
              COUNT(DISTINCT user_id)::int AS readers,
              COUNT(DISTINCT book_id)::int AS books
       FROM book_reading_events
       WHERE read_on >= $1::date AND read_on < $2::date
       GROUP BY genre ORDER BY page_reads DESC, genre ASC LIMIT 10`,
      [startDate, endDate],
    ),
    pool.query(
      `SELECT book_id, COUNT(*)::int AS page_reads,
              COUNT(DISTINCT user_id)::int AS readers
       FROM book_reading_events
       WHERE read_on >= $1::date AND read_on < $2::date
       GROUP BY book_id ORDER BY page_reads DESC, book_id ASC LIMIT 10`,
      [startDate, endDate],
    ),
    pool.query('SELECT id, title, author, genre FROM library_books'),
  ])
  const dynamicBooks = new Map(dynamicBooksResult.rows.map((book) => [book.id, book]))
  const topBooks = bookResult.rows.map((row) => {
    const book = staticBookById.get(row.book_id) || dynamicBooks.get(row.book_id)
    return book && {
      id: row.book_id,
      title: book.title,
      author: book.author,
      genre: book.genre,
      pageReads: row.page_reads,
      readers: row.readers,
    }
  }).filter(Boolean)
  const dynamicBookCount = await pool.query('SELECT COUNT(*)::int AS count FROM library_books')
  const accounts = accountsResult.rows[0]
  const activity = readingResult.rows[0]
  res.json({
    month,
    summary: {
      accountsTotal: accounts.total,
      femaleAccounts: accounts.female,
      maleAccounts: accounts.male,
      undisclosedGender: accounts.undisclosed,
      booksTotal: books.length + dynamicBookCount.rows[0].count,
      pageReads: activity.page_reads,
      readers: activity.readers,
      booksRead: activity.books,
      registrations: registrationResult.rows[0].count,
      reviews: reviewResult.rows[0].count,
    },
    topGenres: genreResult.rows.map((row) => ({
      genre: row.genre,
      pageReads: row.page_reads,
      readers: row.readers,
      books: row.books,
    })),
    topBooks,
  })
}))

app.get('/api/admin/books', requireUser, requireAdmin, asyncRoute(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, title, author, published_year, genre, description, language, page_count, created_at
     FROM library_books ORDER BY created_at DESC`,
  )
  res.json({ books: rows.map((row, index) => ({
    ...mapDynamicBook(row, index),
    createdAt: row.created_at,
  })) })
}))

app.get('/api/auth/me', meRateLimiter, asyncRoute(async (req, res) => {
  let user = null
  if (req.session.userId) {
    const { rows } = await pool.query(
      'SELECT id, username, email, role, gender FROM kitobxon_users WHERE id = $1 AND is_blocked = false',
      [req.session.userId],
    )
    user = rows[0] || null
  }
  req.session.csrfToken ||= newCsrfToken()
  await saveSession(req)
  res.json({ user, csrfToken: req.session.csrfToken })
}))

app.get('/api/auth/captcha', captchaLimiter, asyncRoute(async (req, res) => {
  const { svg, answer, expiresAt } = generateCaptcha()
  req.session.captchaAnswer = answer
  req.session.captchaExpires = expiresAt
  req.session.captchaGeneratedAt = Date.now()
  await saveSession(req)
  res.json({ svg })
}))

app.post('/api/auth/register', authLimiter, requireCsrf, asyncRoute(async (req, res) => {
  // Honeypot spam tekshiruvi (botlar avtomatik to'ldirib yuboradigan yashirin maydon)
  if (req.body?.hp_website) {
    return res.status(400).json({ error: 'Spam aniqlandi.' })
  }

  // Server-side Time-trap (odam CAPTCHA olgandan keyin 1 soniyadan tez forma to'ldira olmaydi)
  const serverRenderedAt = Number(req.session?.captchaGeneratedAt)
  const clientRenderedAt = Number(req.body?.renderedAt)
  const referenceTime = serverRenderedAt || clientRenderedAt
  if (referenceTime && Date.now() - referenceTime < 1000) {
    return res.status(400).json({ error: 'Juda tez yuborildi. Iltimos, qayta urinib ko‘ring.' })
  }

  // Captcha tekshiruvi
  if (!verifyCaptcha(req, req.body?.captcha)) {
    return res.status(400).json({ error: 'Xavfsizlik kodi (CAPTCHA) noto‘g‘ri yoki eskirgan. Qaytadan hisoblab kiriting.' })
  }

  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const gender = req.body?.gender
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return res.status(400).json({ error: 'Username 3–24 belgidan iborat bo‘lsin: lotin harflari, raqam yoki _.' })
  }
  if (!emailPattern.test(email) || email.length > 320) {
    return res.status(400).json({ error: 'To‘g‘ri email manzilini kiriting.' })
  }
  const emailDomain = email.split('@').at(-1)
  if (!['gmail.com', 'googlemail.com'].includes(emailDomain)) {
    return res.status(400).json({ error: 'Gmail manzilidan foydalaning.' })
  }
  if (!['female', 'male', 'undisclosed'].includes(gender)) {
    return res.status(400).json({ error: 'Jins bo‘yicha variantlardan birini tanlang.' })
  }
  if (Buffer.byteLength(password, 'utf8') < 8 || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return res.status(400).json({ error: 'Parol kamida 8 va ko‘pi bilan 128 bayt bo‘lishi kerak.' })
  }

  const passwordHash = await hashPassword(password)
  const id = randomUUID()
  try {
    await pool.query(
      'INSERT INTO kitobxon_users (id, username, email, password_hash, gender, role) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, username, email, passwordHash, gender, 'user'],
    )
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Bu username yoki email allaqachon ro‘yxatdan o‘tgan.' })
    }
    throw error
  }

  const sessionUser = await beginUserSession(req, { id, username, email, role: 'user', gender })
  notifyNewUser({ username, email }).catch(() => {})
  res.status(201).json({ user: { id, username, email, role: 'user', gender }, csrfToken: sessionUser.csrfToken })
}))

app.post('/api/auth/login', authLimiter, requireCsrf, asyncRoute(async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return res.status(401).json({ error: 'Username yoki parol noto‘g‘ri.' })
  }

  const { rows } = await pool.query(
    'SELECT id, username, email, password_hash, role, gender, is_blocked FROM kitobxon_users WHERE lower(username) = lower($1)',
    [username],
  )
  const user = rows[0]
  const matches = await verifyPassword(password, user?.password_hash || dummyPasswordHash)
  if (!user || !matches) {
    return res.status(401).json({ error: 'Username yoki parol noto‘g‘ri.' })
  }

  if (user.is_blocked) {
    return res.status(403).json({ error: 'Akkauntingiz bloklangan. Administrator bilan bog‘laning.' })
  }
  const sessionUser = await beginUserSession(req, user)
  await pool.query('UPDATE kitobxon_users SET last_login_at = now() WHERE id = $1', [user.id])
  res.json({ user: { id: user.id, username: user.username, email: user.email, role: user.role, gender: user.gender }, csrfToken: sessionUser.csrfToken })
}))

app.post('/api/auth/logout', requireCsrf, requireUser, asyncRoute(async (req, res) => {
  await destroySession(req)
  res.clearCookie('kitobxon.sid', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
  res.status(204).end()
}))

app.get('/api/books/:bookId/reviews', asyncRoute(async (req, res) => {
  if (!await bookExists(req.params.bookId)) return res.status(404).json({ error: 'Kitob topilmadi.' })
  const reviewQueries = [
    pool.query(
      'SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average, COUNT(*)::int AS count FROM book_reviews WHERE book_id = $1',
      [req.params.bookId],
    ),
    pool.query(
      `SELECT r.rating, r.comment, r.created_at, r.updated_at, u.username
       FROM book_reviews r
       JOIN kitobxon_users u ON u.id = r.user_id
       WHERE r.book_id = $1
       ORDER BY r.updated_at DESC
       LIMIT 100`,
      [req.params.bookId],
    ),
  ]
  if (req.session.userId) {
    reviewQueries.push(pool.query(
      'SELECT rating, comment FROM book_reviews WHERE book_id = $1 AND user_id = $2',
      [req.params.bookId, req.session.userId],
    ))
  }
  const [summary, result, ownReview] = await Promise.all(reviewQueries)
  res.json({
    average: Number(summary.rows[0].average),
    count: Number(summary.rows[0].count),
    myReview: ownReview?.rows[0] || null,
    reviews: result.rows.map((row) => ({
      rating: row.rating,
      comment: row.comment,
      username: row.username,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  })
}))

app.post('/api/books/:bookId/reviews', reviewLimiter, requireCsrf, requireUser, asyncRoute(async (req, res) => {
  if (req.body?.hp_website) return res.status(400).json({ error: 'Spam aniqlandi.' })
  if (!await bookExists(req.params.bookId)) return res.status(404).json({ error: 'Kitob topilmadi.' })
  const rating = Number(req.body?.rating)
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : ''
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: '1 dan 5 gacha yulduz tanlang.' })
  }
  if (!comment || comment.length > 2000) {
    return res.status(400).json({ error: 'Izoh 1–2000 belgi bo‘lishi kerak.' })
  }

  const { rows } = await pool.query(
    `INSERT INTO book_reviews (id, user_id, book_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, book_id)
     DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = now()
     RETURNING rating, comment, created_at, updated_at, (xmax = 0) AS is_new`,
    [randomUUID(), req.user.id, req.params.bookId, rating, comment],
  )

  // Telegramga xabar yuborish (flood himoyasi: faqat yangi sharh yoki 5 daqiqalik tanaffusdan keyin)
  const isNew = Boolean(rows[0]?.is_new)
  const now = Date.now()
  const lastNotifiedAt = Number(req.session?.lastReviewNotifiedAt || 0)
  if (isNew || (now - lastNotifiedAt > 5 * 60 * 1000)) {
    if (req.session) {
      req.session.lastReviewNotifiedAt = now
    }
    ;(async () => {
      try {
        const book = staticBookById.get(req.params.bookId) || await getDynamicBook(req.params.bookId)
        notifyNewReview({
          bookTitle: book?.title || 'Kitob',
          username: req.user.username,
          rating,
          comment,
        })
      } catch {}
    })()
  }

  res.status(201).json({
    review: {
      rating: rows[0].rating,
      comment: rows[0].comment,
      username: req.user.username,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
    },
  })
}))

app.get('/api/library', requireUser, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT book_id, favorite, in_reading_list, reading_status, current_chapter,
            progress, bookmarked_chapter
     FROM user_book_state WHERE user_id = $1`,
    [req.user.id],
  )
  const library = Object.fromEntries(rows.map((row) => [row.book_id, {
    favorite: row.favorite,
    inReadingList: row.in_reading_list,
    status: row.reading_status,
    chapter: row.current_chapter,
    progress: row.progress,
    bookmarkedChapter: row.bookmarked_chapter,
  }]))
  res.json({ library })
}))

app.patch('/api/library/:bookId', requireCsrf, requireUser, asyncRoute(async (req, res) => {
  const { bookId } = req.params
  if (!await bookExists(bookId)) return res.status(404).json({ error: 'Kitob topilmadi.' })
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const has = (key) => Object.hasOwn(body, key)
  const booleanFields = ['favorite', 'inReadingList']
  for (const key of booleanFields) {
    if (has(key) && typeof body[key] !== 'boolean') {
      return res.status(400).json({ error: 'Saqlash uchun yuborilgan ma’lumot noto‘g‘ri.' })
    }
  }
  if (has('status') && !['not_started', 'reading', 'completed'].includes(body.status)) {
    return res.status(400).json({ error: 'O‘qish holati noto‘g‘ri.' })
  }
  for (const key of ['chapter', 'progress', 'bookmarkedChapter']) {
    if (has(key) && body[key] !== null && (!Number.isInteger(body[key]) || body[key] < 0)) {
      return res.status(400).json({ error: 'O‘qish holati noto‘g‘ri.' })
    }
  }
  if (has('progress') && body.progress > 100) {
    return res.status(400).json({ error: 'O‘qish foizi 0–100 oralig‘ida bo‘lishi kerak.' })
  }
  const allowed = ['favorite', 'inReadingList', 'status', 'chapter', 'progress', 'bookmarkedChapter']
  if (!allowed.some(has)) return res.status(400).json({ error: 'Saqlash uchun o‘zgarish topilmadi.' })

  const values = [
    req.user.id,
    bookId,
    has('favorite') ? body.favorite : null,
    has('inReadingList') ? body.inReadingList : null,
    has('status') ? body.status : null,
    has('chapter') ? body.chapter : null,
    has('progress') ? body.progress : null,
    has('bookmarkedChapter') ? body.bookmarkedChapter : null,
    has('bookmarkedChapter'),
  ]
  const { rows } = await pool.query(
    `INSERT INTO user_book_state
       (user_id, book_id, favorite, in_reading_list, reading_status, current_chapter, progress, bookmarked_chapter)
     VALUES
       ($1, $2, COALESCE($3::boolean, false), COALESCE($4::boolean, false),
        COALESCE($5::varchar, 'not_started'), COALESCE($6::integer, 0), COALESCE($7::integer, 0),
        CASE WHEN $9::boolean THEN $8::integer ELSE NULL END)
     ON CONFLICT (user_id, book_id) DO UPDATE SET
       favorite = COALESCE($3::boolean, user_book_state.favorite),
       in_reading_list = COALESCE($4::boolean, user_book_state.in_reading_list),
       reading_status = COALESCE($5::varchar, user_book_state.reading_status),
       current_chapter = COALESCE($6::integer, user_book_state.current_chapter),
       progress = COALESCE($7::integer, user_book_state.progress),
       bookmarked_chapter = CASE WHEN $9::boolean THEN $8::integer ELSE user_book_state.bookmarked_chapter END,
       updated_at = now()
     RETURNING book_id, favorite, in_reading_list, reading_status, current_chapter, progress, bookmarked_chapter`,
    values,
  )
  const row = rows[0]
  res.json({ state: {
    bookId: row.book_id,
    favorite: row.favorite,
    inReadingList: row.in_reading_list,
    status: row.reading_status,
    chapter: row.current_chapter,
    progress: row.progress,
    bookmarkedChapter: row.bookmarked_chapter,
  } })
}))

app.post('/api/admin/books', adminWriteLimiter, requireCsrf, requireUser, requireAdmin, parsePdfUpload, asyncRoute(async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  const author = typeof req.body?.author === 'string' ? req.body.author.trim() : ''
  const publishedYear = Number(req.body?.publishedYear)
  const genre = typeof req.body?.genre === 'string' ? req.body.genre.trim() : ''
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : ''
  const language = typeof req.body?.language === 'string' ? req.body.language.trim() : 'O‘zbekcha'
  const file = req.file

  if (!title || title.length > 200 || !author || author.length > 200) {
    return res.status(400).json({ error: 'Kitob nomi va muallifini kiriting (200 belgigacha).' })
  }
  if (!Number.isInteger(publishedYear) || publishedYear < 1000 || publishedYear > 2200) {
    return res.status(400).json({ error: 'Nashr yilini 1000–2200 oralig‘ida kiriting.' })
  }
  if (!genre || genre.length > 100 || description.length > 3000 || !language || language.length > 60) {
    return res.status(400).json({ error: 'Janr, izoh yoki til maydoni noto‘g‘ri to‘ldirilgan.' })
  }
  if (!file) return res.status(400).json({ error: 'PDF faylini tanlang.' })
  if (file.buffer.length < 8 || file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return res.status(400).json({ error: 'Tanlangan fayl haqiqiy PDF emas.' })
  }

  let pages
  try {
    pages = await extractPdfPages(file.buffer)
  } catch (error) {
    return res.status(400).json({ error: error.message || 'PDFdan matn ajratib olinmadi.' })
  }

  const id = createBookId(title)
  const storageKey = `kitobxon-books/${id}.pdf`
  const storedFile = await objectStorage.uploadFromBytes(storageKey, file.buffer)
  if (!storedFile.ok) {
    console.error('App Storage upload failed:', storedFile.error?.message || 'unknown storage error')
    return res.status(503).json({ error: 'PDFni saqlash xizmati hozir ishlamayapti. storage papkasiga yozish huquqini tekshiring.' })
  }

  const client = await pool.connect()
  let transactionOpen = false
  try {
    await client.query('BEGIN')
    transactionOpen = true
    await client.query(
      `INSERT INTO library_books
        (id, title, author, published_year, genre, description, language, page_count, storage_key, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, title, author, publishedYear, genre, description, language, pages.length, storageKey, req.user.id],
    )
    await client.query(
      `INSERT INTO book_pages (book_id, page_number, content_text)
       SELECT $1, page_number, content_text
       FROM unnest($2::integer[], $3::text[]) AS page_data(page_number, content_text)`,
      [id, pages.map((_page, index) => index + 1), pages],
    )
    await client.query('COMMIT')
    transactionOpen = false
    await logAdminAction(pool, req.user, 'book.create', 'book', id, title)
    res.status(201).json({
      book: mapDynamicBook({
        id, title, author, published_year: publishedYear,
        genre, description, language, page_count: pages.length,
      }),
    })
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK').catch(() => {})
    await objectStorage.delete(storageKey, { ignoreNotFound: true }).catch(() => {})
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Kitobni saqlashda takroriy ma’lumot topildi.' })
    }
    throw error
  } finally {
    client.release()
  }
}))

// pdf.js uchun dekoder va shrift fayllari (skaner rasmlari, kirill/xitoy shriftlari uchun kerak).
// Fayllar o'rnatilgan pdfjs-dist paketidan olinadi, shuning uchun versiya doim mos keladi.
const pdfjsRoot = path.join(projectRoot, 'node_modules', 'pdfjs-dist')
for (const folder of ['wasm', 'cmaps', 'standard_fonts', 'iccs']) {
  app.use(`/pdfjs/${folder}`, express.static(path.join(pdfjsRoot, folder), { maxAge: '7d' }))
}

registerAdminRoutes(app, { pool, objectStorage, requireCsrf, requireUser, requireAdmin, asyncRoute, mapDynamicBook })
registerSupportRoutes(app, { pool, requireCsrf, requireUser, requireAdmin, asyncRoute, logAdminAction, verifyCaptcha })
registerAdRoutes(app, { pool, requireCsrf, requireUser, requireAdmin, asyncRoute, logAdminAction })
registerBlogRoutes(app, { pool, requireCsrf, requireUser, requireAdmin, asyncRoute, logAdminAction })

// Google AdSense ads.txt fayli
app.get('/ads.txt', async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM site_settings WHERE key = 'adsense_client_id'")
    const clientId = rows[0]?.value?.trim()
    if (clientId) {
      const pubId = clientId.replace(/^ca-/, '')
      if (/^pub-\d{16}$/.test(pubId)) {
        res.type('text/plain').send(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`)
        return
      }
    }
  } catch {}
  res.sendFile(path.join(projectRoot, 'public', 'ads.txt'))
})

// Qidiruv robotlari uchun robots.txt fayli (to'g'ridan-to'g'ri ruxsat berilgan)
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain; charset=utf-8').send(
`User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Google-InspectionTool
Allow: /

Sitemap: https://e-kitobxon.uz/sitemap.xml
`
  )
})

// Dinamik Sitemap (Google va qidiruv tizimlari uchun barcha kitoblar va blog maqolalari bilan)
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const { rows: bookRows } = await pool.query(
      'SELECT id, created_at FROM library_books ORDER BY created_at DESC',
    )
    let blogRows = []
    try {
      const bRes = await pool.query(
        'SELECT slug, updated_at FROM blog_posts WHERE is_published = true ORDER BY updated_at DESC',
      )
      blogRows = bRes.rows
    } catch {}

    const baseUrl = 'https://e-kitobxon.uz'
    const staticPages = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/search', priority: '0.9', changefreq: 'daily' },
      { path: '/blog', priority: '0.9', changefreq: 'daily' },
      { path: '/about', priority: '0.7', changefreq: 'monthly' },
      { path: '/support', priority: '0.7', changefreq: 'monthly' },
      { path: '/privacy', priority: '0.4', changefreq: 'yearly' },
      { path: '/terms', priority: '0.4', changefreq: 'yearly' },
    ]

    const urls = [
      ...staticPages.map(
        (p) => `  <url>
    <loc>${baseUrl}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
      ),
      ...bookRows.map(
        (b) => `  <url>
    <loc>${baseUrl}/books/${encodeURIComponent(b.id)}</loc>
    <lastmod>${new Date(b.created_at || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
      ),
      ...blogRows.map(
        (post) => `  <url>
    <loc>${baseUrl}/blog/${encodeURIComponent(post.slug)}</loc>
    <lastmod>${new Date(post.updated_at || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
      ),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

    res.header('Content-Type', 'application/xml')
    res.header('Cache-Control', 'public, max-age=3600')
    res.send(xml)
  } catch (error) {
    console.error('Sitemap xatolik:', error.message)
    res.sendFile(path.join(projectRoot, 'public', 'sitemap.xml'))
  }
})

app.use('/api', (_req, res) => res.status(404).json({ error: 'API manzili topilmadi.' }))

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(projectRoot, 'dist'), { index: false }))
  app.get('*', (_req, res) => res.sendFile(path.join(projectRoot, 'dist', 'index.html')))
} else {
  viteServer = await createViteServer({
    root: projectRoot,
    configFile: path.join(projectRoot, 'vite.config.js'),
    appType: 'spa',
    server: { middlewareMode: true, hmr: { server } },
  })
  app.use(viteServer.middlewares)
}

app.use((error, _req, res, _next) => {
  console.error('Kitobxon request failed:', error.message)
  if (res.headersSent) return
  const status = Number(error.status || error.statusCode)
  if (status >= 400 && status < 500) {
    if (error.type === 'entity.too.large') {
      return res.status(status).json({ error: 'Yuborilgan ma’lumot hajmi juda katta (maksimal 20 KB).' })
    }
    if (error.type === 'entity.parse.failed') {
      return res.status(status).json({ error: 'Yuborilgan JSON formati noto‘g‘ri.' })
    }
    return res.status(status).json({ error: error.message || 'Noto‘g‘ri so‘rov yuborildi.' })
  }
  res.status(500).json({ error: 'Serverda xatolik yuz berdi. Birozdan so‘ng qayta urinib ko‘ring.' })
})

dummyPasswordHash = await hashPassword(randomBytes(32).toString('hex'))
await provisionAdminFromSecrets()
server.listen(port, '0.0.0.0', () => {
  console.log(`Kitobxon server listening on port ${port}`)
  startAutoBackupScheduler(pool)
})

async function shutdown() {
  if (viteServer) await viteServer.close()
  await new Promise((resolve) => server.close(resolve))
  await pool.end()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
