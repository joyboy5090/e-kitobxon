// Kitobxon — Adabiy Blog va Maqolalar boshqaruvi

import { randomUUID } from 'node:crypto'

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isSafeBlogCoverUrl(url) {
  if (!url || typeof url !== 'string') return true
  const trimmed = url.trim()
  if (!trimmed) return true
  if (trimmed.length > 1000) return false
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/['’`ʼʻ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 180)
}

export async function initBlogTables(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id uuid PRIMARY KEY,
        slug varchar(220) UNIQUE NOT NULL,
        title varchar(300) NOT NULL,
        excerpt text NOT NULL,
        content text NOT NULL,
        cover_image text DEFAULT '',
        category varchar(100) NOT NULL DEFAULT 'Adabiyot',
        author_name varchar(150) NOT NULL DEFAULT 'Kitobxon tahririyati',
        reading_time integer NOT NULL DEFAULT 4,
        views_count integer NOT NULL DEFAULT 0,
        is_published boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, created_at DESC);
    `)

    // Boshlang'ich adabiy maqolalar (agar jadval bo'sh bo'lsa)
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM blog_posts')
    if (rows[0].count === 0) {
      const initialPosts = [
        {
          id: randomUUID(),
          slug: 'abdulla-qodiriy-va-ozbek-romanchiligi',
          title: 'Abdulla Qodiriy va o‘zbek romanchiligining tug‘ilishi',
          excerpt: 'O‘zbek adabiyotida ilk roman janrining paydo bo‘lishi, "O‘tkan kunlar" asarining yozilish tarixi va uning xalqimiz tafakkuridagi o‘rni haqida batafsil tahlil.',
          content: `## Milliy uyg‘onish va yangi janr ehtiyoji

XX asr boshlarida Turkiston jadid adabiyoti ulkan ma’rifiy to‘lqin ichida yashadi. Behbudiy, Fitrat, Cho‘lpon va Abdulla Qodiriy xalq ongini uyg‘otish, millatni jaholatdan asrab qolish uchun yangi adabiy shakllarga ehtiyoj sezdilar. Shu davrgacha o‘zbek kitobxoni doston va qissalarga oshno edi, biroq zamon talabiga javob bera oladigan, jamiyatning butun ijtimoiy manzarasini aks ettiruvchi yirik epik asar — roman hali yaratilmagan edi.

Abdulla Qodiriy o‘zining mashhur so‘zboshisida shunday yozadi:
> *"Modomiki, biz yangi davrga oyoq qo‘ydik, bas, biz har bir yo‘sunda ham shu yangi davrning yangiliklari ketidan ergashamiz va shunga o‘xshash dostonchilik, ro‘monchilik va hikoyachilikda ham yangi tusda asarlar berishga tirishamiz..."*

## "O‘tkan kunlar" — muhabbat va tarix fojiasi

1922-yilda "Inqilob" jurnalida bo‘lim-bo‘lim chop etila boshlagan "O‘tkan kunlar" romani o‘zbek adabiyotida portlash yasadi. Asar voqealari XIX asr o‘rtalaridagi Qo‘qon xonligi davri — xonliklar o‘rtasidagi parokandalik, qipchoq-qiyot qirg‘inlari va millatning ichki nizo botqog‘iga botgan kunlari fonida kechadi.

Otabek va Kumushbibi muhabbati oddiy ishqiy sarguzasht emas. Bu ikki yuksak ma’rifatli qalbning fojiasi — xalqning mudroqligi, xotin-qizlar huquqsizligi va ota-onalarning ko‘r-ko‘rona urf-odatlariga qurbon bo‘lgan sevgidir.

### Qodiriy tilining sehri
Qodiriy nasrining kuchi — uning jonli xalqona tilida. Yozuvchi Toshkent va Marg‘ilon lahjalarining boyliklarini yuksak adabiy til darajasiga olib chiqdi. Dialoglar shunchalik tabiiy va psixologik jihatdan aniqki, kitobxon o‘zini Marg‘ilondagi Qutidor hovlisida yoki Toshkent ko‘chalarida yurgandek his qiladi.

## Xulosa: Nega bugun ham "O‘tkan kunlar"ni o‘qishimiz kerak?

Bugungi kun kitobxoni uchun bu roman o‘z o‘tmishini xolisona tushunish, milliy birdamlikning qadriga yetish va adabiyotning go‘zalligini anglash uchun bebaho manbadir. e-kitobxon.uz kutubxonasida ushbu asarning to‘liq matnini bepul mutolaa qilishingiz mumkin.`,
          category: 'Adabiyot tarixi',
          author_name: 'Kitobxon tahririyati',
          reading_time: 5,
          is_published: true,
          created_at: new Date('2026-10-25T10:00:00Z'),
        },
        {
          id: randomUUID(),
          slug: 'kitob-oqishning-ilmiy-isbotlangan-foydalari',
          title: 'Mutolaa sehri: Kitob o‘qish miyamizni qanday o‘zgartiradi?',
          excerpt: 'Neyrobiologlar va psixologlarning ilmiy tadqiqotlari: har kuni atigi 20 daqiqa kitob o‘qish xotira, diqqat va umr davomiyligiga qanday ta’sir ko‘rsatadi?',
          content: `## Raqamli asrda mutolaaning qadri

Zamonaviy inson har kuni minglab qisqa xabarlar, videolar va ijtimoiy tarmoq tasmalarini (feed) ko‘zdan kechiradi. Biroq nevrologlarning ta’kidlashicha, qisqa videolarni ko‘rish miyadagi diqqat markazini kuchsizlantiradi va "klip tafakkur"ni rivojlantiradi.

Buning aksi o‘laroq, chuqur va sokin kitob mutolaasi miya neyronlari o‘rtasidagi aloqalarni mustahkamlovchi eng samarali mashqdir.

### 1. Stress darajasini 68 foizga pasaytiradi
Sasseks universiteti olimlari tomonidan o‘tkazilgan tajriba shuni ko‘rsatdiki, bor-yo‘g‘i **6 daqiqa sokin kitob o‘qish** inson tanasidagi kortizol (stress gormoni) darajasini 68% ga tushiradi. Bu musiqa tinglashdan ham, sayr qilishdan ham ko‘ra tezroq tinchlantiradi.

### 2. Empatiya va his-tuyg‘ularni tushunish
Badiiy kitob o‘qiyotganingizda, qahramonning quvonchi va iztiroblarini o‘z tanangizda his qilasiz. Miya skanerlari shuni ko‘rsatadiki, kitobda yugurish tasvirlanganida, miyaning harakatga javobgar neyronlari faollashadi. Bu esa hayotda boshqa insonlarni yaxshiroq tushunishga (empatiya) yordam beradi.

### 3. Altsgeymer va miya qarishidan himoya
Faol o‘qiydigan insonlarda xotira susayishi va Altsgeymer kasalligi rivojlanish ehtimoli 32% kamroq ekani aniqlangan. Miyani doimiy faol ushlab turish kognitiv zaxirani yillar davomida saqlab qoladi.

## Har kuni o‘qish odatini qanday shakllantirish mumkin?
* **Kichikdan boshlang:** Kuniga 15-20 sahifa.
* **Qulay vaqt tanlang:** Uyqudan oldin yoki ertalabki choy ustida.
* **Chalg‘ituvchi vositalarni o‘chiring:** Telefon bildirishnomalarini jim rejimga qo‘ying.
* **e-kitobxon.uz kutubxonasidan foydalaning:** Yo‘lda, navbatda yoki sayohatda bo‘lganingizda brauzer orqali qulay mutolaa qiling!`,
          category: 'Mutolaa sirlari',
          author_name: 'Kitobxon tahririyati',
          reading_time: 4,
          is_published: true,
          created_at: new Date('2026-10-26T12:00:00Z'),
        },
        {
          id: randomUUID(),
          slug: 'cholpon-kecha-va-kunduz-romanining-falsafasi',
          title: 'Cho‘lponning "Kecha va kunduz" romani: Qorong‘ulikdan nur sari',
          excerpt: 'Zebi fojiasi, jaholat va ma’rifat to‘qnashuvi: Abdulhamid Cho‘lpon qalamiga mansub boqiylik kasb etgan shoh asarning falsafiy qatlamlari.',
          content: `## Ikki qismdan iborat orzu: "Kecha" va "Kunduz"

Abdulhamid Sulaymon o‘g‘li Cho‘lpon o‘zbek adabiyotining eng yorqin, eng nozik qalb shoiri va daho nosiridir. U o‘zining ikki qismli yirik romanini niyat qilgan edi: "Kecha" — Turkistonning chor mustamlakasi va xonliklar zulmati ostidagi qorong‘u tuni, "Kunduz" esa millatning uyg‘ongan, erkka erishgan yorug‘ tongi bo‘lishi kerak edi.

Afsuski, 1937-yilgi qatag‘on Cho‘lpon hayotiga zomin bo‘ldi va "Kunduz" qismi qo‘lyozmalari yo‘qotildi. Bizgacha faqat "Kecha" yetib keldi. Ammo shu birgina asarning o‘zi Cho‘lponning qanchalik buyuk san’atkor bo‘lganini isbotlashga yetarlidir.

### Zebi — erksizlik timsoli
Roman bosh qahramoni Zebi — go‘zal, quvnoq, qo‘shiqchi qiz. Uning eng katta orzusi — bog‘da dugonalari bilan o‘ynash, bahor yomg‘iridan zavqlanish. Biroq otasi Razzoq so‘fining kaltafahmligi, soxta taqvosi va Akbarali mingboshining nafsi Zebining yosh umrini xazon qiladi.

Zebi timsolida Cho‘lpon o‘zbek ayolining, kengroq ma’noda esa butun bir millatning erksizligini, tutqinligini ko‘rsatib berdi.

### Miryoqub obrazi — o‘zgarayotgan inson
Romanning eng qiziqarli personajlaridan biri — Miryoqub. U dastlab mingboshining ayyor va shafqatsiz yugurdagi sifatida ko‘rinadi. Ammo poyezd safarida, jadid ziyolilari va Mariya bilan muloqotda uning ko‘zlari ochiladi. U o‘z hayotining tubanligini tushunib yetadi va ma’rifat sari yuzlanadi. Bu — millat uyg‘onishining ramzidir.

## Xulosa
"Kecha va kunduz" bugungi o‘quvchiga inson erki, ma’rifat va haqiqiy imonning naqadar qimmatli ne’mat ekanligini eslatib turadi. Bu asarni har bir o‘zbek xonadoni takror-takror mutolaa qilishi shart.`,
          category: 'Taqriz',
          author_name: 'Kitobxon tahririyati',
          reading_time: 6,
          is_published: true,
          created_at: new Date('2026-10-27T14:30:00Z'),
        },
        {
          id: randomUUID(),
          slug: 'ernest-xeminguey-chol-va-dengiz-falsafasi',
          title: 'Ernest Xeminguey: "Insonni yengib bo‘lmaydi"',
          excerpt: 'Nobel mukofotiga sazovor bo‘lgan "Chol va dengiz" qissasi: inson irodasi, yengilmaslik ruhi va Santyagoning ulkan bahri muhit bilan kechgan kurashi.',
          content: `## Aysberg nazariyasining cho‘qqisi

Amerikalik mashhur yozuvchi Ernest Xeminguey 1952-yilda o‘zining eng mashhur asari — "Chol va dengiz" (The Old Man and the Sea) qissasini e’lon qildi. Ushbu qissa uchun muallif Pulitser va adabiyot bo‘yicha Nobel mukofotiga loyiq ko‘rildi.

Xemingueyning mashhur "aysberg nazariyasi"ga ko‘ra, asarning yetti qismi suv tagida, ko‘rinmas chuqurlikda bo‘lishi kerak. "Chol va dengiz" ana shu tamoyilning yorqin ifodasidir: sirtda qari baliqchining baliq ovlash safari ko‘rinsa-da, tagida butun insoniyat hayotining falsafasi yotadi.

### Santyagoning irodasi
84 kundan buyon birorta ham baliq tutolmagan qari baliqchi Santyago umidini uzmaydi. U yana dengizga yo‘l oladi va ulkan marlin balig‘ini qarmoqqa ilintiradi. Uch kecha-kunduz davom etgan kurashda chol o‘z kuchi, sabri va qat’iyatini namoyon etadi.

Uning tili bilan aytilgan ushbu so‘zlar jahon adabiyotining oltin fondiga kirdi:
> *"Inson taslim bo‘lish uchun yaratilmagan. Uni yo‘q qilish mumkin, ammo yengib bo‘lmaydi!"*

### Nega kitobxonlar bu asarni sevishadi?
Chunki Santyago — har birimizmiz. Hayotda duch keladigan qiyinchiliklar, omadsizliklar va ko‘rinmas akulalar qarshisida inson o‘z qadr-qimmati va sha’nini saqlab qolishi kerakligini bu qissa oddiy, ammo o‘ta ta’sirli tarzda uqtiradi.

Kutubxonamizda Ernest Xeminguey asarlarini mutolaa qilib, jahon adabiyotining teran falsafasidan bahramand bo‘ling.`,
          category: 'Jahon adabiyoti',
          author_name: 'Kitobxon tahririyati',
          reading_time: 4,
          is_published: true,
          created_at: new Date('2026-10-28T09:00:00Z'),
        },
      ]

      for (const post of initialPosts) {
        await pool.query(`
          INSERT INTO blog_posts (id, slug, title, excerpt, content, category, author_name, reading_time, is_published, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          post.id, post.slug, post.title, post.excerpt, post.content,
          post.category, post.author_name, post.reading_time, post.is_published, post.created_at,
        ])
      }
    }
  } catch (err) {
    console.error('Blog jadvallarini ishga tushirishda xatolik:', err.message)
  }
}

export function registerBlogRoutes(app, deps) {
  const { pool, requireCsrf, requireUser, requireAdmin, asyncRoute, logAdminAction } = deps
  const guard = [requireUser, requireAdmin]

  initBlogTables(pool)

  // ==========================================
  //  FOYDALANUVCHILAR UCHUN OCHIQ YO'LLAR
  // ==========================================

  // Maqolalar ro'yxati (kategoriya, qidiruv va sahifalash bilan)
  app.get('/api/blog', asyncRoute(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 9))
    const offset = (page - 1) * limit
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : ''
    const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : ''
    const escapedSearch = search.replace(/[\\%_]/g, '\\$&')

    const params = []
    let whereClauses = ['is_published = true']

    if (category && category !== 'all' && category !== 'Barchasi') {
      params.push(category)
      whereClauses.push(`category = $${params.length}`)
    }

    if (escapedSearch) {
      params.push(`%${escapedSearch}%`)
      whereClauses.push(`(title ILIKE $${params.length} OR excerpt ILIKE $${params.length} OR content ILIKE $${params.length})`)
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const countQuery = await pool.query(
      `SELECT COUNT(*)::int AS total FROM blog_posts ${whereSql}`,
      params
    )
    const total = countQuery.rows[0]?.total || 0

    const listQuery = await pool.query(
      `SELECT id, slug, title, excerpt, cover_image, category, author_name, reading_time, views_count, created_at
       FROM blog_posts
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    // Barcha mavjud kategoriyalar
    const catQuery = await pool.query(`
      SELECT category, COUNT(*)::int AS count
      FROM blog_posts
      WHERE is_published = true
      GROUP BY category
      ORDER BY count DESC
    `)

    res.json({
      posts: listQuery.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      categories: catQuery.rows,
    })
  }))

  // Bitta maqolani slug bo'yicha olish (ko'rishlar sonini oshirish bilan)
  app.get('/api/blog/:slug', asyncRoute(async (req, res) => {
    const { slug } = req.params

    const postQuery = await pool.query(
      `SELECT * FROM blog_posts WHERE slug = $1 AND is_published = true`,
      [slug]
    )

    if (!postQuery.rows.length) {
      return res.status(404).json({ error: 'Maqola topilmadi' })
    }

    const post = postQuery.rows[0]

    // Ko'rishlar sonini fonda oshirish
    pool.query(
      `UPDATE blog_posts SET views_count = views_count + 1 WHERE id = $1`,
      [post.id]
    ).catch(() => {})

    // O'xshash yoki boshqa 3 ta tavsiya maqola
    const relatedQuery = await pool.query(
      `SELECT id, slug, title, excerpt, cover_image, category, author_name, reading_time, views_count, created_at
       FROM blog_posts
       WHERE is_published = true AND id != $1
       ORDER BY (category = $2) DESC, created_at DESC
       LIMIT 3`,
      [post.id, post.category]
    )

    res.json({
      post: { ...post, views_count: post.views_count + 1 },
      relatedPosts: relatedQuery.rows,
    })
  }))

  // ==========================================
  //  ADMIN BOSHQARUV YO'LLARI
  // ==========================================

  // Barcha maqolalar (qoralamalar ham)
  app.get('/api/admin/blog', ...guard, asyncRoute(async (_req, res) => {
    const { rows } = await pool.query(`
      SELECT id, slug, title, excerpt, cover_image, category, author_name, reading_time, views_count, is_published, created_at, updated_at
      FROM blog_posts
      ORDER BY created_at DESC
    `)
    res.json(rows)
  }))

  // Yangi maqola yaratish
  app.post('/api/admin/blog', ...guard, requireCsrf, asyncRoute(async (req, res) => {
    const {
      title,
      slug: customSlug,
      excerpt,
      content,
      cover_image = '',
      category = 'Adabiyot',
      author_name = 'Kitobxon tahririyati',
      reading_time = 4,
      is_published = true,
    } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Maqola sarlavhasi kiritilishi shart' })
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Maqola matni kiritilishi shart' })
    }
    if (cover_image && !isSafeBlogCoverUrl(cover_image)) {
      return res.status(400).json({ error: 'Rasm havolasi noto‘g‘ri (faqat http://, https:// yoki / bilan boshlanuvchi havola qabul qilinadi).' })
    }

    let finalSlug = slugify(customSlug || title)
    if (!finalSlug) finalSlug = `maqola-${Date.now()}`

    // Slug takrorlanmasligini tekshirish
    const exists = await pool.query('SELECT id FROM blog_posts WHERE slug = $1', [finalSlug])
    if (exists.rows.length) {
      finalSlug = `${finalSlug}-${Math.floor(Math.random() * 900 + 100)}`
    }

    const cleanExcerpt = (excerpt || content.replace(/<[^>]*>?/gm, '').slice(0, 200)).trim()
    const id = randomUUID()

    const { rows } = await pool.query(`
      INSERT INTO blog_posts (id, slug, title, excerpt, content, cover_image, category, author_name, reading_time, is_published, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
      RETURNING *
    `, [
      id,
      finalSlug,
      title.trim(),
      cleanExcerpt,
      content.trim(),
      (cover_image || '').trim(),
      (category || 'Adabiyot').trim(),
      (author_name || 'Kitobxon tahririyati').trim(),
      Math.max(1, parseInt(reading_time, 10) || 3),
      Boolean(is_published),
    ])

    await logAdminAction(pool, req.user, 'blog.create', 'blog_post', id, title.trim())
    res.status(201).json(rows[0])
  }))

  // Maqolani tahrirlash
  app.put('/api/admin/blog/:id', ...guard, requireCsrf, asyncRoute(async (req, res) => {
    const { id } = req.params
    if (!UUID_PATTERN.test(id)) {
      return res.status(404).json({ error: 'Maqola topilmadi' })
    }
    const {
      title,
      slug: customSlug,
      excerpt,
      content,
      cover_image = '',
      category = 'Adabiyot',
      author_name = 'Kitobxon tahririyati',
      reading_time = 4,
      is_published = true,
    } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Maqola sarlavhasi kiritilishi shart' })
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Maqola matni kiritilishi shart' })
    }
    if (cover_image && !isSafeBlogCoverUrl(cover_image)) {
      return res.status(400).json({ error: 'Rasm havolasi noto‘g‘ri (faqat http://, https:// yoki / bilan boshlanuvchi havola qabul qilinadi).' })
    }

    let finalSlug = slugify(customSlug || title)
    if (!finalSlug) finalSlug = `maqola-${Date.now()}`

    const conflict = await pool.query('SELECT id FROM blog_posts WHERE slug = $1 AND id != $2', [finalSlug, id])
    if (conflict.rows.length) {
      finalSlug = `${finalSlug}-${Math.floor(Math.random() * 900 + 100)}`
    }

    const cleanExcerpt = (excerpt || content.replace(/<[^>]*>?/gm, '').slice(0, 200)).trim()

    const { rows } = await pool.query(`
      UPDATE blog_posts
      SET title = $1,
          slug = $2,
          excerpt = $3,
          content = $4,
          cover_image = $5,
          category = $6,
          author_name = $7,
          reading_time = $8,
          is_published = $9,
          updated_at = now()
      WHERE id = $10
      RETURNING *
    `, [
      title.trim(),
      finalSlug,
      cleanExcerpt,
      content.trim(),
      (cover_image || '').trim(),
      (category || 'Adabiyot').trim(),
      (author_name || 'Kitobxon tahririyati').trim(),
      Math.max(1, parseInt(reading_time, 10) || 3),
      Boolean(is_published),
      id,
    ])

    if (!rows.length) {
      return res.status(404).json({ error: 'Maqola topilmadi' })
    }

    await logAdminAction(pool, req.user, 'blog.update', 'blog_post', id, title.trim())
    res.json(rows[0])
  }))

  // Maqolani o'chirish
  app.delete('/api/admin/blog/:id', ...guard, requireCsrf, asyncRoute(async (req, res) => {
    const { id } = req.params
    if (!UUID_PATTERN.test(id)) {
      return res.status(404).json({ error: 'Maqola topilmadi' })
    }

    const { rows } = await pool.query('DELETE FROM blog_posts WHERE id = $1 RETURNING title, slug', [id])
    if (!rows.length) {
      return res.status(404).json({ error: 'Maqola topilmadi' })
    }

    await logAdminAction(pool, req.user, 'blog.delete', 'blog_post', id, rows[0].title)
    res.json({ success: true, message: 'Maqola muvaffaqiyatli o‘chirildi' })
  }))
}
