import {
  createDatabaseBackup,
  listBackups,
  getSafeBackupPath,
  deleteBackupFile,
} from './backup.js'

// Admin panel uchun qo'shimcha API yo'llari.
// Barcha yo'llar faqat kirgan ADMIN uchun ishlaydi (requireUser + requireAdmin).

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const USERS_PAGE_SIZE = 20
const AUDIT_PAGE_SIZE = 30

function parsePage(value) {
  const number = Number.parseInt(value, 10)
  return Number.isInteger(number) && number > 0 ? Math.min(number, 100000) : 1
}

function validateBookFields(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const author = typeof body?.author === 'string' ? body.author.trim() : ''
  const genre = typeof body?.genre === 'string' ? body.genre.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const language = typeof body?.language === 'string' ? body.language.trim() : ''
  const publishedYear = Number(body?.publishedYear)

  if (!title || title.length > 200 || !author || author.length > 200) {
    return { error: 'Kitob nomi va muallifini kiriting (200 belgigacha).' }
  }
  if (!Number.isInteger(publishedYear) || publishedYear < 1000 || publishedYear > 2200) {
    return { error: 'Nashr yilini 1000–2200 oralig‘ida kiriting.' }
  }
  if (!genre || genre.length > 100 || description.length > 3000 || !language || language.length > 60) {
    return { error: 'Janr, izoh yoki til maydoni noto‘g‘ri to‘ldirilgan.' }
  }
  return { value: { title, author, publishedYear, genre, description, language } }
}

export async function logAdminAction(pool, admin, action, targetType, targetId, details = '') {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, admin_username, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [admin.id, admin.username, action, targetType, String(targetId).slice(0, 100), String(details).slice(0, 500)],
    )
  } catch (error) {
    // Jurnal yozilmasa ham asosiy amal bekor bo'lmasin
    console.error('Audit log failed:', error.message)
  }
}

export function registerAdminRoutes(app, deps) {
  const { pool, objectStorage, requireCsrf, requireUser, requireAdmin, asyncRoute, mapDynamicBook } = deps
  const guard = [requireUser, requireAdmin]

  // ---------- Kunlik statistika (grafik uchun) ----------
  app.get('/api/admin/stats/daily', ...guard, asyncRoute(async (req, res) => {
    const month = typeof req.query.month === 'string' ? req.query.month : new Date().toISOString().slice(0, 7)
    const match = MONTH_PATTERN.exec(month)
    if (!match) return res.status(400).json({ error: 'Oy formati YYYY-MM bo‘lishi kerak.' })
    const year = Number(match[1])
    const monthNumber = Number(match[2])
    const startDate = `${month}-01`
    const endDate = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10)
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()

    const [reads, registrations] = await Promise.all([
      pool.query(
        `SELECT read_on::text AS day, COUNT(*)::int AS page_reads, COUNT(DISTINCT user_id)::int AS readers
         FROM book_reading_events
         WHERE read_on >= $1::date AND read_on < $2::date
         GROUP BY read_on`,
        [startDate, endDate],
      ),
      pool.query(
        `SELECT created_at::date::text AS day, COUNT(*)::int AS count
         FROM kitobxon_users
         WHERE role = 'user' AND created_at >= $1::date AND created_at < $2::date
         GROUP BY 1`,
        [startDate, endDate],
      ),
    ])
    const readMap = new Map(reads.rows.map((row) => [row.day, row]))
    const regMap = new Map(registrations.rows.map((row) => [row.day, row.count]))
    const days = Array.from({ length: daysInMonth }, (_unused, index) => {
      const date = `${month}-${String(index + 1).padStart(2, '0')}`
      return {
        date,
        pageReads: readMap.get(date)?.page_reads || 0,
        readers: readMap.get(date)?.readers || 0,
        registrations: regMap.get(date) || 0,
      }
    })
    res.json({ month, days })
  }))

  // ---------- Foydalanuvchilar ----------
  app.get('/api/admin/users', ...guard, asyncRoute(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : ''
    const role = ['user', 'admin'].includes(req.query.role) ? req.query.role : ''
    const status = ['active', 'blocked'].includes(req.query.status) ? req.query.status : ''
    const page = parsePage(req.query.page)

    const params = []
    const where = []
    if (q) {
      params.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`)
      where.push(`(u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`)
    }
    if (role) {
      params.push(role)
      where.push(`u.role = $${params.length}`)
    }
    if (status) where.push(status === 'blocked' ? 'u.is_blocked = true' : 'u.is_blocked = false')
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const listParams = [...params, USERS_PAGE_SIZE, (page - 1) * USERS_PAGE_SIZE]
    const [list, count, summary] = await Promise.all([
      pool.query(
        `SELECT u.id, u.username, u.email, u.role, u.is_blocked, u.created_at, u.last_login_at,
                (SELECT COUNT(*)::int FROM book_reading_events e WHERE e.user_id = u.id) AS page_reads,
                (SELECT COUNT(*)::int FROM user_book_state s
                  WHERE s.user_id = u.id AND s.reading_status = 'completed') AS completed_books
         FROM kitobxon_users u ${whereSql}
         ORDER BY u.created_at DESC, u.id
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        listParams,
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM kitobxon_users u ${whereSql}`, params),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
                COUNT(*) FILTER (WHERE is_blocked)::int AS blocked
         FROM kitobxon_users`,
      ),
    ])
    res.json({
      users: list.rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        role: row.role,
        isBlocked: row.is_blocked,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        pageReads: row.page_reads,
        completedBooks: row.completed_books,
      })),
      total: count.rows[0].total,
      page,
      pageSize: USERS_PAGE_SIZE,
      summary: summary.rows[0],
    })
  }))

  app.patch('/api/admin/users/:userId', requireCsrf, ...guard, asyncRoute(async (req, res) => {
    const id = req.params.userId
    if (!UUID_PATTERN.test(id)) return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' })
    if (id === req.user.id) return res.status(400).json({ error: 'O‘z akkauntingizni bu yerdan o‘zgartira olmaysiz.' })

    const { rows } = await pool.query('SELECT id, username, role, is_blocked FROM kitobxon_users WHERE id = $1', [id])
    const target = rows[0]
    if (!target) return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' })

    const hasBlock = typeof req.body?.isBlocked === 'boolean'
    const hasRole = req.body?.role !== undefined
    if (!hasBlock && !hasRole) return res.status(400).json({ error: 'O‘zgartirish ko‘rsatilmagan.' })
    if (hasRole && !['user', 'admin'].includes(req.body.role)) {
      return res.status(400).json({ error: 'Rol noto‘g‘ri.' })
    }
    const newRole = hasRole ? req.body.role : target.role
    const newBlocked = hasBlock ? req.body.isBlocked : target.is_blocked
    if (newRole === 'admin' && newBlocked) {
      return res.status(400).json({ error: 'Adminni bloklab bo‘lmaydi. Avval uni oddiy foydalanuvchiga o‘zgartiring.' })
    }

    await pool.query('UPDATE kitobxon_users SET role = $2, is_blocked = $3 WHERE id = $1', [id, newRole, newBlocked])
    if (newBlocked && !target.is_blocked) {
      await pool.query(`DELETE FROM kitobxon_sessions WHERE sess->>'userId' = $1`, [id])
      await logAdminAction(pool, req.user, 'user.block', 'user', id, target.username)
    }
    if (!newBlocked && target.is_blocked) {
      await logAdminAction(pool, req.user, 'user.unblock', 'user', id, target.username)
    }
    if (newRole !== target.role) {
      await logAdminAction(pool, req.user, 'user.role', 'user', id, `${target.username}: ${target.role} → ${newRole}`)
    }
    res.json({ ok: true })
  }))

  app.delete('/api/admin/users/:userId', requireCsrf, ...guard, asyncRoute(async (req, res) => {
    const id = req.params.userId
    if (!UUID_PATTERN.test(id)) return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' })
    if (id === req.user.id) return res.status(400).json({ error: 'O‘z akkauntingizni o‘chira olmaysiz.' })

    const { rows } = await pool.query('SELECT id, username, role FROM kitobxon_users WHERE id = $1', [id])
    const target = rows[0]
    if (!target) return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' })
    if (target.role === 'admin') {
      return res.status(400).json({ error: 'Adminni o‘chirib bo‘lmaydi. Avval uni oddiy foydalanuvchiga o‘zgartiring.' })
    }
    try {
      await pool.query(`DELETE FROM kitobxon_sessions WHERE sess->>'userId' = $1`, [id])
      await pool.query('DELETE FROM kitobxon_users WHERE id = $1', [id])
    } catch (error) {
      if (error.code === '23503') {
        return res.status(409).json({ error: 'Bu foydalanuvchi kitob yuklagan, o‘chirib bo‘lmaydi. Uni bloklang.' })
      }
      throw error
    }
    await logAdminAction(pool, req.user, 'user.delete', 'user', id, target.username)
    res.json({ ok: true })
  }))

  // ---------- Kitobni tahrirlash va o'chirish ----------
  app.patch('/api/admin/books/:bookId', requireCsrf, ...guard, asyncRoute(async (req, res) => {
    const bookId = req.params.bookId
    if (bookId.length > 100) return res.status(404).json({ error: 'Kitob topilmadi.' })
    const result = validateBookFields(req.body)
    if (result.error) return res.status(400).json({ error: result.error })
    const b = result.value
    const { rows } = await pool.query(
      `UPDATE library_books
       SET title = $2, author = $3, published_year = $4, genre = $5, description = $6, language = $7
       WHERE id = $1
       RETURNING id, title, author, published_year, genre, description, language, page_count, created_at`,
      [bookId, b.title, b.author, b.publishedYear, b.genre, b.description, b.language],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Kitob topilmadi.' })
    await logAdminAction(pool, req.user, 'book.update', 'book', bookId, b.title)
    res.json({ book: { ...mapDynamicBook(rows[0]), createdAt: rows[0].created_at } })
  }))

  app.delete('/api/admin/books/:bookId', requireCsrf, ...guard, asyncRoute(async (req, res) => {
    const bookId = req.params.bookId
    if (bookId.length > 100) return res.status(404).json({ error: 'Kitob topilmadi.' })
    const client = await pool.connect()
    let deleted
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM user_book_state WHERE book_id = $1', [bookId])
      await client.query('DELETE FROM book_reviews WHERE book_id = $1', [bookId])
      await client.query('DELETE FROM book_reading_events WHERE book_id = $1', [bookId])
      const result = await client.query(
        'DELETE FROM library_books WHERE id = $1 RETURNING title, storage_key',
        [bookId],
      )
      deleted = result.rows[0]
      if (!deleted) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'Kitob topilmadi.' })
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
    await Promise.resolve(objectStorage.delete(deleted.storage_key)).catch(() => {})
    await logAdminAction(pool, req.user, 'book.delete', 'book', bookId, deleted.title)
    res.json({ ok: true })
  }))

  // ---------- Faoliyat jurnali ----------
  app.get('/api/admin/audit', ...guard, asyncRoute(async (req, res) => {
    const page = parsePage(req.query.page)
    const [list, count] = await Promise.all([
      pool.query(
        `SELECT id, admin_username, action, target_type, target_id, details, created_at
         FROM admin_audit_log ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2`,
        [AUDIT_PAGE_SIZE, (page - 1) * AUDIT_PAGE_SIZE],
      ),
      pool.query('SELECT COUNT(*)::int AS total FROM admin_audit_log'),
    ])
    res.json({
      entries: list.rows.map((row) => ({
        id: String(row.id),
        admin: row.admin_username,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        details: row.details,
        createdAt: row.created_at,
      })),
      total: count.rows[0].total,
      page,
      pageSize: AUDIT_PAGE_SIZE,
    })
  }))

  // ---------- Zaxira nusxa (Backup) tizimi ----------
  app.get('/api/admin/backups', ...guard, asyncRoute(async (_req, res) => {
    const backups = await listBackups()
    res.json({ backups })
  }))

  app.post('/api/admin/backups', ...guard, requireCsrf, asyncRoute(async (req, res) => {
    const backup = await createDatabaseBackup(pool, req.user.username)
    await logAdminAction(pool, req.user, 'backup.create', 'system', backup.filename, `Hajmi: ${backup.sizeFormatted}`)
    res.status(201).json({ backup })
  }))

  app.get('/api/admin/backups/:filename/download', ...guard, asyncRoute(async (req, res) => {
    const filepath = getSafeBackupPath(req.params.filename)
    res.download(filepath, req.params.filename)
  }))

  app.delete('/api/admin/backups/:filename', ...guard, requireCsrf, asyncRoute(async (req, res) => {
    await deleteBackupFile(req.params.filename)
    await logAdminAction(pool, req.user, 'backup.delete', 'system', req.params.filename)
    res.json({ success: true })
  }))
}
