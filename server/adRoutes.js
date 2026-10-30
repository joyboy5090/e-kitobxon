// Kitobxon — Reklama va Monetizatsiya boshqaruvi (Google AdSense + Ichki Bannerlar)

import { randomUUID } from 'node:crypto'

export async function initAdTables(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_banners (
        id uuid PRIMARY KEY,
        title varchar(200) NOT NULL,
        image_url text NOT NULL,
        link_url text NOT NULL,
        placement varchar(50) NOT NULL DEFAULT 'all',
        is_active boolean NOT NULL DEFAULT true,
        views_count integer NOT NULL DEFAULT 0,
        clicks_count integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS site_settings (
        key varchar(100) PRIMARY KEY,
        value text NOT NULL DEFAULT '',
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // Boshlang'ich AdSense sozlamasi
    await pool.query(`
      INSERT INTO site_settings (key, value)
      VALUES ('adsense_client_id', 'ca-pub-1115153746763009')
      ON CONFLICT (key) DO UPDATE SET value = 'ca-pub-1115153746763009' WHERE site_settings.value = ''
    `)
    await pool.query(`
      INSERT INTO site_settings (key, value)
      VALUES ('adsense_enabled', 'true')
      ON CONFLICT (key) DO NOTHING
    `)

    // Namuna banner (agar jadval bo'sh bo'lsa)
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM ad_banners')
    if (rows[0].count === 0) {
      await pool.query(`
        INSERT INTO ad_banners (id, title, image_url, link_url, placement, is_active) VALUES
        ($1, 'Kitobxon yangi kitoblar to‘plami', '', 'https://e-kitobxon.uz/search', 'all', true)
      `, [randomUUID()])
    }
  } catch (err) {
    console.error('Reklama jadvallarini ishga tushirishda xatolik:', err.message)
  }
}

export function registerAdRoutes(app, deps) {
  const { pool, requireCsrf, requireUser, requireAdmin, asyncRoute, logAdminAction } = deps
  const guard = [requireUser, requireAdmin]

  initAdTables(pool)

  // ==========================================
  //  FOYDALANUVCHILAR UCHUN OCHIQ YO'LLAR
  // ==========================================

  // Faol reklamalarni olish (placement bo'yicha)
  app.get('/api/ads', asyncRoute(async (req, res) => {
    const placement = typeof req.query.placement === 'string' ? req.query.placement : 'all'

    const [bannersResult, settingsResult] = await Promise.all([
      pool.query(
        `SELECT id, title, image_url, link_url, placement, created_at
         FROM ad_banners
         WHERE is_active = true AND (placement = $1 OR placement = 'all' OR $1 = 'all')
         ORDER BY RANDOM()
         LIMIT 6`,
        [placement],
      ),
      pool.query(`SELECT key, value FROM site_settings WHERE key IN ('adsense_client_id', 'adsense_enabled')`),
    ])

    const settings = {}
    for (const row of settingsResult.rows) {
      settings[row.key] = row.value
    }

    res.json({
      banners: bannersResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        imageUrl: row.image_url,
        linkUrl: row.link_url,
        placement: row.placement,
      })),
      adsense: {
        clientId: settings.adsense_client_id || '',
        enabled: settings.adsense_enabled === 'true',
      },
    })
  }))

  // Ko'rishlar sonini oshirish
  app.post('/api/ads/:id/view', asyncRoute(async (req, res) => {
    const { id } = req.params
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(404).json({ error: 'Banner topilmadi' })
    }
    const result = await pool.query(
      `UPDATE ad_banners SET views_count = views_count + 1 WHERE id = $1 RETURNING id`,
      [id],
    )
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Banner topilmadi' })
    }
    res.json({ ok: true })
  }))

  // Bosishlar sonini oshirish
  app.post('/api/ads/:id/click', asyncRoute(async (req, res) => {
    const { id } = req.params
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(404).json({ error: 'Banner topilmadi' })
    }
    const result = await pool.query(
      `UPDATE ad_banners SET clicks_count = clicks_count + 1 WHERE id = $1 RETURNING id`,
      [id],
    )
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Banner topilmadi' })
    }
    res.json({ ok: true })
  }))

  // ==========================================
  //  ADMIN UCHUN BOSHQARUV YO'LLARI
  // ==========================================

  // Barcha reklamalar ro'yxati va AdSense sozlamalari
  app.get('/api/admin/ads', ...guard, asyncRoute(async (_req, res) => {
    const [bannersResult, settingsResult] = await Promise.all([
      pool.query(`SELECT * FROM ad_banners ORDER BY created_at DESC`),
      pool.query(`SELECT key, value FROM site_settings WHERE key IN ('adsense_client_id', 'adsense_enabled')`),
    ])

    const settings = {}
    for (const row of settingsResult.rows) {
      settings[row.key] = row.value
    }

    res.json({
      banners: bannersResult.rows.map((r) => ({
        id: r.id,
        title: r.title,
        imageUrl: r.image_url,
        linkUrl: r.link_url,
        placement: r.placement,
        isActive: r.is_active,
        viewsCount: r.views_count,
        clicksCount: r.clicks_count,
        ctr: r.views_count > 0 ? ((r.clicks_count / r.views_count) * 100).toFixed(2) : '0.00',
        createdAt: r.created_at,
      })),
      adsense: {
        clientId: settings.adsense_client_id || '',
        enabled: settings.adsense_enabled === 'true',
      },
    })
  }))

  // Yangi banner qo'shish
  app.post('/api/admin/ads', ...guard, requireCsrf, asyncRoute(async (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
    const imageUrl = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : ''
    const linkUrl = typeof req.body?.linkUrl === 'string' ? req.body.linkUrl.trim() : ''
    const placement = ['all', 'home_top', 'reader_side', 'book_detail'].includes(req.body?.placement)
      ? req.body.placement
      : 'all'
    const isActive = req.body?.isActive !== false

    if (!title || title.length > 200) {
      return res.status(400).json({ error: 'Reklama sarlavhasi 1–200 belgi bo‘lishi kerak.' })
    }
    if (!linkUrl) {
      return res.status(400).json({ error: 'Yo‘naltirish havolasini (link) kiriting.' })
    }
    if (!/^https?:\/\//i.test(linkUrl)) {
      return res.status(400).json({ error: 'Havola faqat http:// yoki https:// bilan boshlanishi kerak.' })
    }

    const id = randomUUID()
    await pool.query(
      `INSERT INTO ad_banners (id, title, image_url, link_url, placement, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, title, imageUrl, linkUrl, placement, isActive],
    )

    await logAdminAction(pool, req.user, 'ad.create', 'ad_banner', id, title)

    res.status(201).json({
      banner: { id, title, imageUrl, linkUrl, placement, isActive, viewsCount: 0, clicksCount: 0 },
    })
  }))

  // Bannerni tahrirlash yoki holatini o'zgartirish
  app.patch('/api/admin/ads/:id', ...guard, requireCsrf, asyncRoute(async (req, res) => {
    const { id } = req.params
    const { rows } = await pool.query('SELECT * FROM ad_banners WHERE id = $1', [id])
    if (!rows[0]) return res.status(404).json({ error: 'Reklama topilmadi.' })

    const banner = rows[0]
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : banner.title
    const imageUrl = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : banner.image_url
    const linkUrl = typeof req.body?.linkUrl === 'string' ? req.body.linkUrl.trim() : banner.link_url
    const placement = typeof req.body?.placement === 'string' ? req.body.placement : banner.placement
    const isActive = typeof req.body?.isActive === 'boolean' ? req.body.isActive : banner.is_active

    await pool.query(
      `UPDATE ad_banners
       SET title = $1, image_url = $2, link_url = $3, placement = $4, is_active = $5, updated_at = now()
       WHERE id = $6`,
      [title, imageUrl, linkUrl, placement, isActive, id],
    )

    await logAdminAction(pool, req.user, 'ad.update', 'ad_banner', id, title)

    res.json({ ok: true })
  }))

  // Bannerni o'chirish
  app.delete('/api/admin/ads/:id', ...guard, requireCsrf, asyncRoute(async (req, res) => {
    const { id } = req.params
    const { rows } = await pool.query('DELETE FROM ad_banners WHERE id = $1 RETURNING title', [id])
    if (!rows[0]) return res.status(404).json({ error: 'Reklama topilmadi.' })

    await logAdminAction(pool, req.user, 'ad.delete', 'ad_banner', id, rows[0].title)
    res.json({ ok: true })
  }))

  // Google AdSense sozlamalarini yangilash
  app.post('/api/admin/ads/adsense-config', ...guard, requireCsrf, asyncRoute(async (req, res) => {
    const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId.trim() : ''
    const enabled = req.body?.enabled ? 'true' : 'false'

    await pool.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ('adsense_client_id', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [clientId],
    )
    await pool.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ('adsense_enabled', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [enabled],
    )

    await logAdminAction(pool, req.user, 'adsense.update', 'settings', clientId, `Enabled: ${enabled}`)

    res.json({ ok: true, clientId, enabled: enabled === 'true' })
  }))
}
