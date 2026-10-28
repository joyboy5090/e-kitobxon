// Qo'llab-quvvatlash tizimi uchun API yo'llari.
// Foydalanuvchi murojaat (shikoyat/taklif) yuboradi, admin javob qaytaradi.
// Ko'p beriladigan savollar (FAQ) admin tomonidan boshqariladi.

import { randomUUID } from 'node:crypto'
import { notifyNewTicket } from './telegram.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TICKETS_PAGE_SIZE = 20
const VALID_TICKET_TYPES = ['complaint', 'suggestion']
const VALID_STATUSES = ['new', 'in_progress', 'resolved', 'closed']

const STATUS_LABELS = {
  new: 'Yangi',
  in_progress: 'Jarayonda',
  resolved: 'Hal qilindi',
  closed: 'Yopildi',
}

function parsePage(value) {
  const number = Number.parseInt(value, 10)
  return Number.isInteger(number) && number > 0 ? Math.min(number, 100000) : 1
}

export async function initSupportTables(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id serial PRIMARY KEY,
        admin_id uuid NOT NULL,
        admin_username varchar(24) NOT NULL,
        action varchar(60) NOT NULL,
        target_type varchar(30) NOT NULL,
        target_id varchar(100) NOT NULL,
        details varchar(500) NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES kitobxon_users(id) ON DELETE CASCADE,
        type varchar(20) NOT NULL CHECK (type IN ('complaint', 'suggestion')),
        subject varchar(200) NOT NULL,
        message varchar(3000) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'new'
          CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON support_tickets (user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets (status, created_at DESC);

      CREATE TABLE IF NOT EXISTS support_replies (
        id uuid PRIMARY KEY,
        ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        admin_id uuid NOT NULL REFERENCES kitobxon_users(id),
        message varchar(3000) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS support_replies_ticket_idx ON support_replies (ticket_id, created_at);

      CREATE TABLE IF NOT EXISTS faq_items (
        id serial PRIMARY KEY,
        question varchar(500) NOT NULL,
        answer varchar(3000) NOT NULL,
        category varchar(100) NOT NULL DEFAULT 'Umumiy',
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // Agar FAQ bo'sh bo'lsa, foydali namunaviy savollarni kiritish
    const existing = await pool.query('SELECT COUNT(*)::int AS count FROM faq_items')
    if (existing.rows[0].count === 0) {
      await pool.query(`
        INSERT INTO faq_items (question, answer, category, sort_order) VALUES
        ('Kitobni qanday mutolaa qilish mumkin?', 'Istalgan kitob kartasidagi «O‘qish» tugmasini bosib, kitob mutolaasini boshlashingiz mumkin. O‘qish sahifasida ikki rejim mavjud: qulay matn ko‘rinishi va kitobning asl PDF sahifalari ko‘rinishi.', 'Mutolaa', 1),
        ('Xatcho‘p va o‘qish jarayoni qanday saqlanadi?', 'Siz kitobning istalgan sahifasida yuqoridagi «Xatcho‘p» tugmasini bosib qo‘ysangiz, o‘qish joyingiz avtomatik saqlanib qoladi. Keyingi safar kitobni ochganingizda to‘g‘ridan-to‘g‘ri shu sahifadan davom ettirishingiz mumkin.', 'Mutolaa', 2),
        ('Kitoblar uchun qanday qilib baho yoki sharh qoldirish mumkin?', 'Kitobning batafsil sahifasida pastga tushib, 1 dan 5 gacha yulduzcha tanlab va o‘z fikrlaringizni yozib sharh qoldirishingiz mumkin. Barcha sharhlar boshqa o‘quvchilarga ko‘rinadi.', 'Sharhlar', 3),
        ('Shaxsiy kabinetda qanday imkoniyatlar bor?', 'Shaxsiy kabinetingizda siz o‘qiyotgan kitoblar, mutolaa foizi, sevimlilar ro‘yxati hamda umumiy o‘qish statistikangiz (o‘qilgan sahifalar, tugatilgan asarlar) ko‘rsatib boriladi.', 'Hisob', 4),
        ('Agar kitob ochilmasa yoki sahifada xatolik yuz bersa nima qilish kerak?', 'Bunday holatda «Qo‘llab-quvvatlash» sahifasidagi forma orqali ma’muriyatga «Shikoyat» yuborishingiz mumkin. Murojaatda qaysi kitob va qaysi sahifada xatolik yuz berganini aniq ko‘rsatsangiz, muammo tezda bartaraf etiladi.', 'Texnik', 5)
      `)
    }
  } catch (err) {
    console.error('Support jadvallarini ishga tushirishda xatolik:', err.message)
  }
}

export function registerSupportRoutes(app, deps) {
  const { pool, requireCsrf, requireUser, requireAdmin, asyncRoute, logAdminAction, verifyCaptcha } = deps
  const guard = [requireUser, requireAdmin]

  initSupportTables(pool)

  // =====================================================
  //  FOYDALANUVCHI UCHUN YO'LLAR
  // =====================================================

  // Ko'p beriladigan savollar — hamma ko'ra oladi (auth kerak emas)
  app.get('/api/support/faq', asyncRoute(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id, question, answer, category
       FROM faq_items
       WHERE is_active = true
       ORDER BY sort_order ASC, id ASC`,
    )
    res.json({ items: rows })
  }))

  // Foydalanuvchining o'z murojaatlari
  app.get('/api/support/tickets', requireUser, asyncRoute(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT t.id, t.type, t.subject, t.message, t.status, t.created_at, t.updated_at,
              (SELECT COUNT(*)::int FROM support_replies r WHERE r.ticket_id = t.id) AS reply_count
       FROM support_tickets t
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [req.user.id],
    )
    res.json({
      tickets: rows.map((row) => ({
        id: row.id,
        type: row.type,
        subject: row.subject,
        message: row.message,
        status: row.status,
        statusLabel: STATUS_LABELS[row.status] || row.status,
        replyCount: row.reply_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    })
  }))

  // Murojaat tafsilotlari (faqat o'z murojaat)
  app.get('/api/support/tickets/:ticketId', requireUser, asyncRoute(async (req, res) => {
    const { ticketId } = req.params
    if (!UUID_PATTERN.test(ticketId)) return res.status(404).json({ error: 'Murojaat topilmadi.' })

    const ticket = await pool.query(
      'SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2',
      [ticketId, req.user.id],
    )
    if (!ticket.rows[0]) return res.status(404).json({ error: 'Murojaat topilmadi.' })

    const replies = await pool.query(
      `SELECT r.id, r.message, r.created_at, u.username AS admin_username
       FROM support_replies r
       JOIN kitobxon_users u ON u.id = r.admin_id
       WHERE r.ticket_id = $1
       ORDER BY r.created_at ASC`,
      [ticketId],
    )

    const row = ticket.rows[0]
    res.json({
      ticket: {
        id: row.id,
        type: row.type,
        subject: row.subject,
        message: row.message,
        status: row.status,
        statusLabel: STATUS_LABELS[row.status] || row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      replies: replies.rows.map((r) => ({
        id: r.id,
        message: r.message,
        adminUsername: r.admin_username,
        createdAt: r.created_at,
      })),
    })
  }))

  // Yangi murojaat yuborish
  app.post('/api/support/tickets', requireCsrf, requireUser, asyncRoute(async (req, res) => {
    // Spam / bot himoyasi
    if (req.body?.hp_website) {
      return res.status(400).json({ error: 'Spam aniqlandi.' })
    }
    const renderedAt = Number(req.body?.renderedAt)
    if (renderedAt && Date.now() - renderedAt < 1200) {
      return res.status(400).json({ error: 'Juda tez yuborildi. Iltimos, qayta urinib ko‘ring.' })
    }
    if (typeof verifyCaptcha === 'function' && !verifyCaptcha(req, req.body?.captcha)) {
      return res.status(400).json({ error: 'Xavfsizlik kodi (CAPTCHA) noto‘g‘ri yoki eskirgan. Qaytadan hisoblab kiriting.' })
    }

    const type = req.body?.type
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : ''
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''

    if (!VALID_TICKET_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Murojaat turini tanlang: shikoyat yoki taklif.' })
    }
    if (!subject || subject.length > 200) {
      return res.status(400).json({ error: 'Mavzu 1–200 belgi bo‘lishi kerak.' })
    }
    if (!message || message.length > 3000) {
      return res.status(400).json({ error: 'Xabar matni 1–3000 belgi bo‘lishi kerak.' })
    }

    // Bitta foydalanuvchi kuniga 5 tadan ko'p murojaat yubora olmaydi
    const today = await pool.query(
      `SELECT COUNT(*)::int AS count FROM support_tickets
       WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
      [req.user.id],
    )
    if (today.rows[0].count >= 5) {
      return res.status(429).json({ error: 'Kunlik murojaat limiti tugadi. Ertaga qayta urinib ko‘ring.' })
    }

    const id = randomUUID()
    await pool.query(
      `INSERT INTO support_tickets (id, user_id, type, subject, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.user.id, type, subject, message],
    )

    // Telegramga xabar yuborish (fon rejimida)
    notifyNewTicket({ username: req.user.username, type, subject, message }).catch(() => {})

    res.status(201).json({
      ticket: {
        id,
        type,
        subject,
        message,
        status: 'new',
        statusLabel: STATUS_LABELS.new,
        replyCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  }))

  // =====================================================
  //  ADMIN UCHUN YO'LLAR
  // =====================================================

  // Barcha murojaatlar ro'yxati (filtrlash + sahifalash)
  app.get('/api/admin/support/tickets', ...guard, asyncRoute(async (req, res) => {
    const status = VALID_STATUSES.includes(req.query.status) ? req.query.status : ''
    const type = VALID_TICKET_TYPES.includes(req.query.type) ? req.query.type : ''
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : ''
    const page = parsePage(req.query.page)

    const params = []
    const where = []
    if (status) {
      params.push(status)
      where.push(`t.status = $${params.length}`)
    }
    if (type) {
      params.push(type)
      where.push(`t.type = $${params.length}`)
    }
    if (q) {
      params.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`)
      where.push(`(t.subject ILIKE $${params.length} OR u.username ILIKE $${params.length})`)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const listParams = [...params, TICKETS_PAGE_SIZE, (page - 1) * TICKETS_PAGE_SIZE]
    const [list, count, summary] = await Promise.all([
      pool.query(
        `SELECT t.id, t.type, t.subject, t.status, t.created_at, t.updated_at,
                u.username,
                (SELECT COUNT(*)::int FROM support_replies r WHERE r.ticket_id = t.id) AS reply_count
         FROM support_tickets t
         JOIN kitobxon_users u ON u.id = t.user_id
         ${whereSql}
         ORDER BY
           CASE t.status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
           t.created_at DESC, t.id
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        listParams,
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM support_tickets t
         JOIN kitobxon_users u ON u.id = t.user_id ${whereSql}`,
        params,
      ),
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'new')::int AS new_count,
           COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_count,
           COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_count,
           COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_count
         FROM support_tickets`,
      ),
    ])

    res.json({
      tickets: list.rows.map((row) => ({
        id: row.id,
        type: row.type,
        subject: row.subject,
        status: row.status,
        statusLabel: STATUS_LABELS[row.status] || row.status,
        username: row.username,
        replyCount: row.reply_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      total: count.rows[0].total,
      page,
      pageSize: TICKETS_PAGE_SIZE,
      summary: summary.rows[0],
    })
  }))

  // Bitta murojaat tafsilotlari (admin uchun)
  app.get('/api/admin/support/tickets/:ticketId', ...guard, asyncRoute(async (req, res) => {
    const { ticketId } = req.params
    if (!UUID_PATTERN.test(ticketId)) return res.status(404).json({ error: 'Murojaat topilmadi.' })

    const ticket = await pool.query(
      `SELECT t.*, u.username, u.email
       FROM support_tickets t
       JOIN kitobxon_users u ON u.id = t.user_id
       WHERE t.id = $1`,
      [ticketId],
    )
    if (!ticket.rows[0]) return res.status(404).json({ error: 'Murojaat topilmadi.' })

    const replies = await pool.query(
      `SELECT r.id, r.message, r.created_at, u.username AS admin_username
       FROM support_replies r
       JOIN kitobxon_users u ON u.id = r.admin_id
       WHERE r.ticket_id = $1
       ORDER BY r.created_at ASC`,
      [ticketId],
    )

    const row = ticket.rows[0]
    res.json({
      ticket: {
        id: row.id,
        type: row.type,
        subject: row.subject,
        message: row.message,
        status: row.status,
        statusLabel: STATUS_LABELS[row.status] || row.status,
        username: row.username,
        email: row.email,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      replies: replies.rows.map((r) => ({
        id: r.id,
        message: r.message,
        adminUsername: r.admin_username,
        createdAt: r.created_at,
      })),
    })
  }))

  // Admin javob yozadi
  app.post('/api/admin/support/tickets/:ticketId/reply', requireCsrf, ...guard, asyncRoute(async (req, res) => {
    const { ticketId } = req.params
    if (!UUID_PATTERN.test(ticketId)) return res.status(404).json({ error: 'Murojaat topilmadi.' })

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    if (!message || message.length > 3000) {
      return res.status(400).json({ error: 'Javob matni 1–3000 belgi bo‘lishi kerak.' })
    }

    const ticket = await pool.query('SELECT id, subject, status FROM support_tickets WHERE id = $1', [ticketId])
    if (!ticket.rows[0]) return res.status(404).json({ error: 'Murojaat topilmadi.' })

    const id = randomUUID()
    await pool.query(
      'INSERT INTO support_replies (id, ticket_id, admin_id, message) VALUES ($1, $2, $3, $4)',
      [id, ticketId, req.user.id, message],
    )

    // Murojaat holatini «jarayonda»ga o'tkazamiz (agar hali «yangi» bo'lsa)
    if (ticket.rows[0].status === 'new') {
      await pool.query(
        'UPDATE support_tickets SET status = $1, updated_at = now() WHERE id = $2',
        ['in_progress', ticketId],
      )
    } else {
      await pool.query('UPDATE support_tickets SET updated_at = now() WHERE id = $1', [ticketId])
    }

    await logAdminAction(pool, req.user, 'support.reply', 'ticket', ticketId, ticket.rows[0].subject)

    res.status(201).json({
      reply: {
        id,
        message,
        adminUsername: req.user.username,
        createdAt: new Date().toISOString(),
      },
    })
  }))

  // Murojaat holatini o'zgartirish
  app.patch('/api/admin/support/tickets/:ticketId', requireCsrf, ...guard, asyncRoute(async (req, res) => {
    const { ticketId } = req.params
    if (!UUID_PATTERN.test(ticketId)) return res.status(404).json({ error: 'Murojaat topilmadi.' })

    const newStatus = req.body?.status
    if (!VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({ error: 'Noto‘g‘ri holat. Qabul qilinadigan holatlar: new, in_progress, resolved, closed.' })
    }

    const { rows } = await pool.query(
      'UPDATE support_tickets SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, subject',
      [newStatus, ticketId],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Murojaat topilmadi.' })

    await logAdminAction(pool, req.user, 'support.status', 'ticket', ticketId, `${rows[0].subject}: → ${STATUS_LABELS[newStatus]}`)

    res.json({ ok: true, status: newStatus, statusLabel: STATUS_LABELS[newStatus] })
  }))

  // =====================================================
  //  FAQ BOSHQARUVI (ADMIN)
  // =====================================================

  // Barcha FAQ (admin — faol va nofaollar ham)
  app.get('/api/admin/support/faq', ...guard, asyncRoute(async (_req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM faq_items ORDER BY sort_order ASC, id ASC',
    )
    res.json({ items: rows })
  }))

  // Yangi FAQ qo'shish
  app.post('/api/admin/support/faq', requireCsrf, ...guard, asyncRoute(async (req, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''
    const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim() : ''
    const category = typeof req.body?.category === 'string' ? req.body.category.trim() : 'Umumiy'
    const sortOrder = Number.isInteger(req.body?.sortOrder) ? req.body.sortOrder : 0

    if (!question || question.length > 500) {
      return res.status(400).json({ error: 'Savol 1–500 belgi bo‘lishi kerak.' })
    }
    if (!answer || answer.length > 3000) {
      return res.status(400).json({ error: 'Javob 1–3000 belgi bo‘lishi kerak.' })
    }
    if (category.length > 100) {
      return res.status(400).json({ error: 'Kategoriya 100 belgidan oshmasin.' })
    }

    const { rows } = await pool.query(
      `INSERT INTO faq_items (question, answer, category, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [question, answer, category, sortOrder],
    )

    await logAdminAction(pool, req.user, 'faq.create', 'faq', String(rows[0].id), question.slice(0, 100))
    res.status(201).json({ item: rows[0] })
  }))

  // FAQ tahrirlash
  app.patch('/api/admin/support/faq/:faqId', requireCsrf, ...guard, asyncRoute(async (req, res) => {
    const faqId = Number(req.params.faqId)
    if (!Number.isInteger(faqId) || faqId < 1) return res.status(404).json({ error: 'Savol topilmadi.' })

    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''
    const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim() : ''
    const category = typeof req.body?.category === 'string' ? req.body.category.trim() : 'Umumiy'
    const sortOrder = Number.isInteger(req.body?.sortOrder) ? req.body.sortOrder : 0
    const isActive = typeof req.body?.isActive === 'boolean' ? req.body.isActive : true

    if (!question || question.length > 500) {
      return res.status(400).json({ error: 'Savol 1–500 belgi bo‘lishi kerak.' })
    }
    if (!answer || answer.length > 3000) {
      return res.status(400).json({ error: 'Javob 1–3000 belgi bo‘lishi kerak.' })
    }

    const { rows } = await pool.query(
      `UPDATE faq_items
       SET question = $2, answer = $3, category = $4, sort_order = $5, is_active = $6, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [faqId, question, answer, category, sortOrder, isActive],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Savol topilmadi.' })

    await logAdminAction(pool, req.user, 'faq.update', 'faq', String(faqId), question.slice(0, 100))
    res.json({ item: rows[0] })
  }))

  // FAQ o'chirish
  app.delete('/api/admin/support/faq/:faqId', requireCsrf, ...guard, asyncRoute(async (req, res) => {
    const faqId = Number(req.params.faqId)
    if (!Number.isInteger(faqId) || faqId < 1) return res.status(404).json({ error: 'Savol topilmadi.' })

    const { rows } = await pool.query('DELETE FROM faq_items WHERE id = $1 RETURNING question', [faqId])
    if (!rows[0]) return res.status(404).json({ error: 'Savol topilmadi.' })

    await logAdminAction(pool, req.user, 'faq.delete', 'faq', String(faqId), rows[0].question.slice(0, 100))
    res.json({ ok: true })
  }))
}
