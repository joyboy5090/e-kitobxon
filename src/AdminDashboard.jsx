import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Ban, BookCopy, BookOpen, Check, ChevronLeft, ChevronRight, CircleAlert,
  DollarSign, Download, Eye, HardDrive, HelpCircle, LayoutDashboard, LockKeyhole, LogOut,
  Megaphone, MessageSquareMore, Pencil, Plus,
  RefreshCw, ScrollText, Search, Send, ShieldCheck, Trash2, Upload, UserCheck, UsersRound, X
} from 'lucide-react'
import './admin-panel.css'

const numberFormat = new Intl.NumberFormat('uz-UZ')
const displayNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? numberFormat.format(parsed) : '—'
}
const errorText = (error) => {
  if (!error) return ''
  return typeof error === 'string' ? error : error.message || 'Xatolik yuz berdi.'
}
const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}
const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/* ---------- Umumiy komponentlar ---------- */

function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="ap-modal" role="dialog" aria-modal="true" aria-label={title}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className={`ap-modal__box ${wide ? 'ap-modal__box--wide' : ''}`}>
        <header className="ap-modal__head">
          <h2>{title}</h2>
          <button type="button" className="ap-icon-btn" onClick={onClose} aria-label="Yopish"><X size={16} /></button>
        </header>
        <div className="ap-modal__body">{children}</div>
      </div>
    </div>
  )
}

function ConfirmDialog({ title, text, confirmLabel, danger = false, busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={busy ? () => {} : onCancel}>
      <p className="ap-confirm-text">{text}</p>
      <div className="ap-actions-row">
        <button type="button" className="ap-btn" onClick={onCancel} disabled={busy}>Bekor qilish</button>
        <button type="button" className={`ap-btn ${danger ? 'ap-btn--danger' : 'ap-btn--primary'}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Bajarilmoqda…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

function Pager({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  return (
    <nav className="ap-pager" aria-label="Sahifalar">
      <button type="button" className="ap-btn ap-btn--small" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={14} /> Oldingi</button>
      <span>{page} / {pages}</span>
      <button type="button" className="ap-btn ap-btn--small" disabled={page >= pages} onClick={() => onPage(page + 1)}>Keyingi <ChevronRight size={14} /></button>
    </nav>
  )
}

function Empty({ icon: Icon, title, text }) {
  return (
    <div className="ap-empty">
      <span><Icon size={20} /></span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  )
}

function Skeleton({ rows = 4 }) {
  return <div className="ap-skeletons" aria-busy="true">{Array.from({ length: rows }, (_unused, i) => <span key={i} className="ap-skeleton" />)}</div>
}

/* ---------- Boshqaruv (statistika) ---------- */

function StatCard({ label, value }) {
  return <div className="ap-stat"><span>{label}</span><strong>{displayNumber(value)}</strong></div>
}

function DailyChart({ days, metric }) {
  const values = days.map((day) => day[metric] || 0)
  const max = Math.max(...values, 0)
  const total = values.reduce((sum, value) => sum + value, 0)
  return (
    <div>
      <div className="ap-chart" role="img" aria-label={`Kunlik grafik, jami ${total}`}>
        {days.map((day, index) => {
          const value = values[index]
          const height = max ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0
          const dayNumber = Number(day.date.slice(8))
          return (
            <div className="ap-chart__col" key={day.date} title={`${day.date}: ${displayNumber(value)}`}>
              <span className="ap-chart__bar" style={{ height: `${height}%` }} />
              <span className="ap-chart__label">{dayNumber === 1 || dayNumber % 5 === 0 ? dayNumber : ''}</span>
            </div>
          )
        })}
      </div>
      <p className="ap-chart__total">Oy bo‘yicha jami: <strong>{displayNumber(total)}</strong></p>
    </div>
  )
}

function RankingPanel({ icon: Icon, title, subtitle, items, kind }) {
  return (
    <section className="ap-card" aria-label={title}>
      <div className="ap-card__head">
        <span className="ap-card__icon"><Icon size={16} /></span>
        <div><h3>{title}</h3><p>{subtitle}</p></div>
      </div>
      {items?.length ? (
        <ol className="ap-rank">
          {items.map((item, index) => (
            <li key={`${kind}-${item.id ?? item.genre ?? index}`}>
              <span className="ap-rank__n">{String(index + 1).padStart(2, '0')}</span>
              <span className="ap-rank__name">
                {kind === 'books' ? item.title : item.genre}
                <small>{kind === 'books' ? `${item.author || '—'} · ${item.genre || '—'}` : `${displayNumber(item.books)} ta kitob`}</small>
              </span>
              <span className="ap-rank__value">{displayNumber(item.pageReads)}<small>sahifa · {displayNumber(item.readers)} o‘quvchi</small></span>
            </li>
          ))}
        </ol>
      ) : <p className="ap-muted">Tanlangan oy uchun ma’lumot hali yo‘q.</p>}
    </section>
  )
}

function Overview({ stats, month, onMonthChange, onRefresh, loading, error, api }) {
  const summary = stats?.summary || {}
  const [daily, setDaily] = useState(null)
  const [metric, setMetric] = useState('pageReads')
  useEffect(() => {
    if (!month) return undefined
    let cancelled = false
    api(`/api/admin/stats/daily?month=${encodeURIComponent(month)}`)
      .then((data) => { if (!cancelled) setDaily(data.days) })
      .catch(() => { if (!cancelled) setDaily(null) })
    return () => { cancelled = true }
  }, [api, month, stats])

  const metrics = [
    ['Jami akkauntlar', summary.accountsTotal],
    ['Kutubxonadagi kitoblar', summary.booksTotal],
    ['Yangi ro‘yxatdan o‘tish', summary.registrations],
    ['Faol o‘quvchilar', summary.readers],
    ['O‘qilgan sahifalar', summary.pageReads],
    ['O‘qilgan kitoblar', summary.booksRead],
    ['Sharhlar', summary.reviews],
    ['Ayol akkauntlar', summary.femaleAccounts],
    ['Erkak akkauntlar', summary.maleAccounts],
    ['Jinsi ko‘rsatilmagan', summary.undisclosedGender],
  ]

  return (
    <div className="ap-stack">
      <div className="ap-toolbar">
        <label className="ap-field-inline">
          Hisobot oyi
          <input type="month" value={month || ''} onChange={(event) => onMonthChange?.(event.target.value)} aria-label="Hisobot oyini tanlang" />
        </label>
        <button type="button" className="ap-btn" onClick={() => onRefresh?.()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'ap-spin' : ''} /> {loading ? 'Yangilanmoqda' : 'Yangilash'}
        </button>
      </div>

      {error && <div className="ap-alert" role="alert"><CircleAlert size={16} /> {errorText(error)}</div>}

      {loading && !stats ? (
        <div className="ap-stats">{metrics.map(([label]) => <div key={label} className="ap-stat"><span>{label}</span><span className="ap-skeleton" /></div>)}</div>
      ) : (
        <div className="ap-stats">{metrics.map(([label, value]) => <StatCard key={label} label={label} value={value} />)}</div>
      )}

      <section className="ap-card">
        <div className="ap-card__head ap-card__head--split">
          <div><h3>Kunlik faollik</h3><p>{month || 'Oy tanlanmagan'}</p></div>
          <div className="ap-seg" role="tablist" aria-label="Grafik turi">
            <button type="button" role="tab" aria-selected={metric === 'pageReads'} className={metric === 'pageReads' ? 'is-on' : ''} onClick={() => setMetric('pageReads')}>O‘qilgan sahifalar</button>
            <button type="button" role="tab" aria-selected={metric === 'registrations'} className={metric === 'registrations' ? 'is-on' : ''} onClick={() => setMetric('registrations')}>Yangi a’zolar</button>
          </div>
        </div>
        {daily ? <DailyChart days={daily} metric={metric} /> : <Skeleton rows={1} />}
      </section>

      <div className="ap-grid-2">
        <RankingPanel icon={UsersRound} title="Ko‘p o‘qilgan janrlar" subtitle="Sahifa mutolaasi bo‘yicha" items={stats?.topGenres} kind="genres" />
        <RankingPanel icon={BookOpen} title="Ko‘p o‘qilgan kitoblar" subtitle="O‘quvchilar faolligi bo‘yicha" items={stats?.topBooks} kind="books" />
      </div>

      <p className="ap-note"><LockKeyhole size={14} /> Jins bo‘yicha ma’lumot faqat umumiy sonlarda ko‘rsatiladi. Foydalanuvchilar ro‘yxatida jins ko‘rinmaydi.</p>
    </div>
  )
}

/* ---------- Kitoblar ---------- */

const BOOK_FIELDS = ['title', 'author', 'publishedYear', 'genre', 'description', 'language']

function BookForm({ initial = {}, withFile = false, submitLabel, onSubmit, genres = [] }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    setError('')
    setBusy(true)
    try {
      await onSubmit(new FormData(form))
    } catch (submitError) {
      setError(errorText(submitError))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="ap-form" onSubmit={submit}>
      <label className="ap-field">Kitob nomi *
        <input name="title" type="text" maxLength={180} defaultValue={initial.title || ''} placeholder="Masalan, O‘tkan kunlar" required />
      </label>
      <label className="ap-field">Muallif *
        <input name="author" type="text" maxLength={140} defaultValue={initial.author || ''} placeholder="Muallifning ism-familiyasi" required />
      </label>
      <div className="ap-form__pair">
        <label className="ap-field">Nashr yili *
          <input name="publishedYear" type="number" min="1000" max={new Date().getFullYear()} step="1" defaultValue={initial.publishedYear || ''} placeholder="1926" required />
        </label>
        <label className="ap-field">Janr *
          <input name="genre" type="text" list="ap-genres" maxLength={80} defaultValue={initial.genre || ''} placeholder="Tarixiy roman" required />
          <datalist id="ap-genres">{genres.map((genre) => <option key={genre} value={genre} />)}</datalist>
        </label>
      </div>
      <label className="ap-field">Qisqacha tavsif *
        <textarea name="description" maxLength={1500} defaultValue={initial.description || ''} placeholder="Kitob haqida bir necha jumla..." required />
      </label>
      <label className="ap-field">Til *
        <input name="language" type="text" maxLength={60} defaultValue={initial.language || 'O‘zbekcha'} required />
      </label>
      {withFile && (
        <label className="ap-field">PDF fayl * <small>(50 MB gacha)</small>
          <input name="pdf" type="file" accept="application/pdf,.pdf" required />
        </label>
      )}
      {error && <div className="ap-alert" role="alert"><CircleAlert size={15} /> {error}</div>}
      <button className="ap-btn ap-btn--primary" type="submit" disabled={busy}>
        {withFile ? <Upload size={15} /> : <Pencil size={15} />} {busy ? 'Saqlanmoqda…' : submitLabel}
      </button>
    </form>
  )
}

function BooksSection({ books, loading, onUpload, onChanged, api, notify }) {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const genres = useMemo(() => [...new Set(books.map((book) => book.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uz')), [books])
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return [...books]
      .filter((book) => (!genre || book.genre === genre)
        && (!needle || `${book.title} ${book.author}`.toLocaleLowerCase().includes(needle)))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }, [books, query, genre])

  const create = async (values) => {
    const pdf = values.get('pdf')
    if (!(pdf instanceof File) || pdf.size === 0) throw new Error('PDF faylni tanlang.')
    if (pdf.type !== 'application/pdf' && !pdf.name.toLowerCase().endsWith('.pdf')) throw new Error('Faqat PDF formatidagi fayl yuklash mumkin.')
    if (pdf.size > 50 * 1024 * 1024) throw new Error('PDF hajmi 50 MB dan oshmasligi kerak.')
    const payload = new FormData()
    BOOK_FIELDS.forEach((key) => payload.append(key, String(values.get(key) || '').trim()))
    payload.append('pdf', pdf)
    await onUpload(payload)
    setShowCreate(false)
    notify('success', 'Kitob kutubxonaga qo‘shildi.')
  }
  const update = async (values) => {
    const body = {}
    BOOK_FIELDS.forEach((key) => { body[key] = String(values.get(key) || '').trim() })
    await api(`/api/admin/books/${encodeURIComponent(editing.id)}`, { method: 'PATCH', body })
    setEditing(null)
    notify('success', 'Kitob ma’lumotlari yangilandi.')
    onChanged?.()
  }
  const remove = async () => {
    setDeleteBusy(true)
    try {
      await api(`/api/admin/books/${encodeURIComponent(deleting.id)}`, { method: 'DELETE', body: {} })
      notify('success', `“${deleting.title}” o‘chirildi.`)
      setDeleting(null)
      onChanged?.()
    } catch (error) {
      notify('error', errorText(error))
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="ap-stack">
      <div className="ap-toolbar">
        <label className="ap-search"><Search size={15} />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom yoki muallif bo‘yicha qidirish" aria-label="Kitob qidirish" />
        </label>
        <select className="ap-select" value={genre} onChange={(event) => setGenre(event.target.value)} aria-label="Janr bo‘yicha filtr">
          <option value="">Barcha janrlar</option>
          {genres.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type="button" className="ap-btn ap-btn--primary" onClick={() => setShowCreate(true)}><Plus size={15} /> Yangi kitob</button>
      </div>

      <section className="ap-card ap-card--flush">
        {loading && !books.length ? <div className="ap-pad"><Skeleton /></div>
          : visible.length ? (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Kitob</th><th>Janr</th><th>Sahifa</th><th>Qo‘shilgan</th><th className="ap-th-actions">Amallar</th></tr></thead>
                <tbody>
                  {visible.map((book) => (
                    <tr key={book.id}>
                      <td><strong>{book.title}</strong><small>{book.author}{book.publishedYear ? ` · ${book.publishedYear}` : ''}</small></td>
                      <td><span className="ap-badge">{book.genre}</span></td>
                      <td>{displayNumber(book.pageCount)}</td>
                      <td>{formatDate(book.createdAt)}</td>
                      <td className="ap-td-actions">
                        <button type="button" className="ap-icon-btn" onClick={() => setEditing(book)} aria-label={`${book.title} ni tahrirlash`} title="Tahrirlash"><Pencil size={15} /></button>
                        <button type="button" className="ap-icon-btn ap-icon-btn--danger" onClick={() => setDeleting(book)} aria-label={`${book.title} ni o‘chirish`} title="O‘chirish"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon={BookCopy} title={books.length ? 'Hech narsa topilmadi' : 'Hali kitob qo‘shilmagan'} text={books.length ? 'Qidiruv yoki filtrni o‘zgartirib ko‘ring.' : 'Birinchi PDF kitobni “Yangi kitob” tugmasi bilan qo‘shing.'} />
          )}
      </section>
      <p className="ap-note">Bu yerda faqat admin yuklagan kitoblar ko‘rinadi. Dasturga o‘rnatilgan dastlabki kitoblar (catalog.js) shu fayl orqali o‘zgartiriladi.</p>

      {showCreate && (
        <Modal title="Yangi kitob qo‘shish" onClose={() => setShowCreate(false)} wide>
          <BookForm withFile genres={genres} submitLabel="Kitobni kutubxonaga qo‘shish" onSubmit={create} />
        </Modal>
      )}
      {editing && (
        <Modal title="Kitobni tahrirlash" onClose={() => setEditing(null)} wide>
          <BookForm initial={editing} genres={genres} submitLabel="O‘zgarishlarni saqlash" onSubmit={update} />
          <p className="ap-note">PDF faylni almashtirish uchun kitobni o‘chirib, qaytadan yuklang.</p>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog danger busy={deleteBusy} title="Kitobni o‘chirish" confirmLabel="Ha, o‘chirish" onCancel={() => setDeleting(null)} onConfirm={remove}
          text={`“${deleting.title}” kitobi, uning PDF fayli, sharhlari va o‘quvchilarning shu kitobdagi o‘qish tarixi butunlay o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.`} />
      )}
    </div>
  )
}

/* ---------- Foydalanuvchilar ---------- */

function UsersSection({ api, notify, currentUser }) {
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const debouncedQ = useDebounced(q)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (debouncedQ) params.set('q', debouncedQ)
    if (role) params.set('role', role)
    if (status) params.set('status', status)
    api(`/api/admin/users?${params.toString()}`)
      .then((result) => { if (!cancelled) { setData(result); setError('') } })
      .catch((loadError) => { if (!cancelled) setError(errorText(loadError)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [api, debouncedQ, role, status, page, reload])

  useEffect(() => {
    if (data && !data.users.length && page > 1) setPage(page - 1)
  }, [data, page])

  const run = async (user, request, successText) => {
    setBusy(true)
    try {
      await request()
      notify('success', successText)
      setConfirm(null)
      setReload((value) => value + 1)
    } catch (actionError) {
      notify('error', errorText(actionError))
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }
  const patchUser = (user, body) => api(`/api/admin/users/${user.id}`, { method: 'PATCH', body })

  const doConfirm = () => {
    const { kind, user } = confirm
    if (kind === 'block') return run(user, () => patchUser(user, { isBlocked: true }), `${user.username} bloklandi.`)
    if (kind === 'promote') return run(user, () => patchUser(user, { role: 'admin' }), `${user.username} admin qilindi.`)
    if (kind === 'demote') return run(user, () => patchUser(user, { role: 'user' }), `${user.username} oddiy foydalanuvchi bo‘ldi.`)
    return run(user, () => api(`/api/admin/users/${user.id}`, { method: 'DELETE', body: {} }), `${user.username} o‘chirildi.`)
  }
  const confirmCopy = {
    block: ['Foydalanuvchini bloklash', 'Bloklash', 'tizimdan chiqariladi va qayta kira olmaydi. Keyin blokdan chiqarishingiz mumkin.', true],
    promote: ['Admin qilish', 'Admin qilish', 'barcha admin huquqlariga ega bo‘ladi: kitoblar va foydalanuvchilarni boshqara oladi.', false],
    demote: ['Admin huquqini olish', 'Huquqni olish', 'endi oddiy foydalanuvchi bo‘ladi.', true],
    delete: ['Foydalanuvchini o‘chirish', 'Ha, o‘chirish', 'va uning barcha ma’lumotlari (sevimlilar, o‘qish tarixi, sharhlar) butunlay o‘chiriladi. Qaytarib bo‘lmaydi.', true],
  }

  const summary = data?.summary
  return (
    <div className="ap-stack">
      <div className="ap-chips">
        <span>Jami: <strong>{displayNumber(summary?.total)}</strong></span>
        <span>Adminlar: <strong>{displayNumber(summary?.admins)}</strong></span>
        <span>Bloklangan: <strong>{displayNumber(summary?.blocked)}</strong></span>
      </div>
      <div className="ap-toolbar">
        <label className="ap-search"><Search size={15} />
          <input type="search" value={q} onChange={(event) => { setQ(event.target.value); setPage(1) }} placeholder="Username yoki email bo‘yicha qidirish" aria-label="Foydalanuvchi qidirish" />
        </label>
        <select className="ap-select" value={role} onChange={(event) => { setRole(event.target.value); setPage(1) }} aria-label="Rol bo‘yicha filtr">
          <option value="">Barcha rollar</option><option value="user">Foydalanuvchi</option><option value="admin">Admin</option>
        </select>
        <select className="ap-select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} aria-label="Holat bo‘yicha filtr">
          <option value="">Barcha holatlar</option><option value="active">Faol</option><option value="blocked">Bloklangan</option>
        </select>
      </div>
      {error && <div className="ap-alert" role="alert"><CircleAlert size={16} /> {error}</div>}
      <section className="ap-card ap-card--flush">
        {loading && !data ? <div className="ap-pad"><Skeleton /></div>
          : data?.users.length ? (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Foydalanuvchi</th><th>Rol</th><th>Holat</th><th>Mutolaa</th><th>Ro‘yxatdan o‘tgan</th><th>Oxirgi kirish</th><th className="ap-th-actions">Amallar</th></tr></thead>
                <tbody>
                  {data.users.map((user) => {
                    const isSelf = user.id === currentUser?.id
                    const isAdmin = user.role === 'admin'
                    return (
                      <tr key={user.id} className={user.isBlocked ? 'is-blocked' : ''}>
                        <td><strong>{user.username}{isSelf ? ' (siz)' : ''}</strong><small>{user.email}</small></td>
                        <td><span className={`ap-badge ${isAdmin ? 'ap-badge--accent' : ''}`}>{isAdmin ? 'Admin' : 'Foydalanuvchi'}</span></td>
                        <td><span className={`ap-badge ${user.isBlocked ? 'ap-badge--danger' : 'ap-badge--ok'}`}>{user.isBlocked ? 'Bloklangan' : 'Faol'}</span></td>
                        <td>{displayNumber(user.pageReads)} sahifa<small>{displayNumber(user.completedBooks)} ta tugatgan</small></td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>{formatDateTime(user.lastLoginAt)}</td>
                        <td className="ap-td-actions">
                          {isSelf ? <small>—</small> : (<>
                            {user.isBlocked
                              ? <button type="button" className="ap-icon-btn" title="Blokdan chiqarish" aria-label={`${user.username} ni blokdan chiqarish`} disabled={busy}
                                  onClick={() => run(user, () => patchUser(user, { isBlocked: false }), `${user.username} blokdan chiqarildi.`)}><UserCheck size={15} /></button>
                              : !isAdmin && <button type="button" className="ap-icon-btn" title="Bloklash" aria-label={`${user.username} ni bloklash`} onClick={() => setConfirm({ kind: 'block', user })}><Ban size={15} /></button>}
                            {!user.isBlocked && (
                              <button type="button" className="ap-icon-btn" title={isAdmin ? 'Admin huquqini olish' : 'Admin qilish'} aria-label={isAdmin ? `${user.username} dan admin huquqini olish` : `${user.username} ni admin qilish`}
                                onClick={() => setConfirm({ kind: isAdmin ? 'demote' : 'promote', user })}><ShieldCheck size={15} /></button>
                            )}
                            {!isAdmin && <button type="button" className="ap-icon-btn ap-icon-btn--danger" title="O‘chirish" aria-label={`${user.username} ni o‘chirish`} onClick={() => setConfirm({ kind: 'delete', user })}><Trash2 size={15} /></button>}
                          </>)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty icon={UsersRound} title="Foydalanuvchi topilmadi" text="Qidiruv yoki filtrni o‘zgartirib ko‘ring." />}
      </section>
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}

      {confirm && (
        <ConfirmDialog danger={confirmCopy[confirm.kind][3]} busy={busy} title={confirmCopy[confirm.kind][0]} confirmLabel={confirmCopy[confirm.kind][1]}
          onCancel={() => setConfirm(null)} onConfirm={doConfirm}
          text={`“${confirm.user.username}” ${confirmCopy[confirm.kind][2]}`} />
      )}
    </div>
  )
}

/* ---------- Faoliyat jurnali ---------- */

const ACTION_LABELS = {
  'book.create': 'Kitob qo‘shildi',
  'book.update': 'Kitob tahrirlandi',
  'book.delete': 'Kitob o‘chirildi',
  'user.block': 'Foydalanuvchi bloklandi',
  'user.unblock': 'Blokdan chiqarildi',
  'user.role': 'Rol o‘zgartirildi',
  'user.delete': 'Foydalanuvchi o‘chirildi',
}

function AuditSection({ api }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api(`/api/admin/audit?page=${page}`)
      .then((result) => { if (!cancelled) { setData(result); setError('') } })
      .catch((loadError) => { if (!cancelled) setError(errorText(loadError)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [api, page])
  return (
    <div className="ap-stack">
      {error && <div className="ap-alert" role="alert"><CircleAlert size={16} /> {error}</div>}
      <section className="ap-card ap-card--flush">
        {loading && !data ? <div className="ap-pad"><Skeleton /></div>
          : data?.entries.length ? (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Vaqt</th><th>Admin</th><th>Amal</th><th>Tafsilot</th></tr></thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDateTime(entry.createdAt)}</td>
                      <td><strong>{entry.admin}</strong></td>
                      <td><span className="ap-badge">{ACTION_LABELS[entry.action] || entry.action}</span></td>
                      <td>{entry.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty icon={ScrollText} title="Jurnal hozircha bo‘sh" text="Kitob va foydalanuvchilar ustidagi amallar shu yerda qayd etiladi." />}
      </section>
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </div>
  )
}

/* ---------- Qo'llab-quvvatlash bo'limi ---------- */

const TICKET_STATUS_LABELS = {
  new: 'Yangi',
  in_progress: 'Jarayonda',
  resolved: 'Hal qilindi',
  closed: 'Yopildi',
}

function SupportSection({ api, notify }) {
  const [subTab, setSubTab] = useState('tickets') // 'tickets' | 'faq'

  return (
    <div className="ap-stack">
      <div className="ap-support-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'tickets'}
          className={subTab === 'tickets' ? 'is-active' : ''}
          onClick={() => setSubTab('tickets')}
        >
          <MessageSquareMore size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Murojaatlar (Shikoyat va takliflar)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'faq'}
          className={subTab === 'faq' ? 'is-active' : ''}
          onClick={() => setSubTab('faq')}
        >
          <HelpCircle size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Ko‘p beriladigan savollar (FAQ)
        </button>
      </div>

      {subTab === 'tickets' ? (
        <TicketsAdmin api={api} notify={notify} />
      ) : (
        <FaqAdmin api={api} notify={notify} />
      )}
    </div>
  )
}

function TicketsAdmin({ api, notify }) {
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const debouncedQ = useDebounced(q)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (debouncedQ) params.set('q', debouncedQ)
    if (status) params.set('status', status)
    if (type) params.set('type', type)

    api(`/api/admin/support/tickets?${params.toString()}`)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [api, debouncedQ, status, type, page, reload])

  const summary = data?.summary

  return (
    <div className="ap-stack">
      <div className="ap-chips">
        <span>Jami: <strong>{displayNumber(summary?.total)}</strong></span>
        <span>Yangi: <strong>{displayNumber(summary?.new_count)}</strong></span>
        <span>Jarayonda: <strong>{displayNumber(summary?.in_progress_count)}</strong></span>
        <span>Hal qilindi: <strong>{displayNumber(summary?.resolved_count)}</strong></span>
        <span>Yopildi: <strong>{displayNumber(summary?.closed_count)}</strong></span>
      </div>

      <div className="ap-toolbar">
        <label className="ap-search">
          <Search size={15} />
          <input
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
            placeholder="Mavzu yoki foydalanuvchi bo‘yicha qidirish"
            aria-label="Murojaat qidirish"
          />
        </label>
        <select
          className="ap-select"
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1) }}
          aria-label="Murojaat turi"
        >
          <option value="">Barcha turlar</option>
          <option value="complaint">Shikoyat</option>
          <option value="suggestion">Taklif</option>
        </select>
        <select
          className="ap-select"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          aria-label="Holat bo‘yicha filtr"
        >
          <option value="">Barcha holatlar</option>
          <option value="new">Yangi</option>
          <option value="in_progress">Jarayonda</option>
          <option value="resolved">Hal qilindi</option>
          <option value="closed">Yopildi</option>
        </select>
      </div>

      {error && (
        <div className="ap-alert" role="alert">
          <CircleAlert size={16} /> {error}
        </div>
      )}

      <section className="ap-card ap-card--flush">
        {loading && !data ? (
          <div className="ap-pad"><Skeleton /></div>
        ) : data?.tickets.length ? (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Mavzu</th>
                  <th>Foydalanuvchi</th>
                  <th>Tur</th>
                  <th>Holat</th>
                  <th>Javoblar</th>
                  <th>Sana</th>
                  <th className="ap-th-actions">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {data.tickets.map((t) => {
                  let badgeModifier = ''
                  if (t.status === 'new') badgeModifier = 'ap-badge--info'
                  else if (t.status === 'in_progress') badgeModifier = 'ap-badge--warning'
                  else if (t.status === 'resolved') badgeModifier = 'ap-badge--ok'
                  else if (t.status === 'closed') badgeModifier = ''

                  return (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.subject}</strong>
                      </td>
                      <td>{t.username}</td>
                      <td>
                        <span className={`ap-badge ${t.type === 'complaint' ? 'ap-badge--danger' : 'ap-badge--info'}`}>
                          {t.type === 'complaint' ? 'Shikoyat' : 'Taklif'}
                        </span>
                      </td>
                      <td>
                        <span className={`ap-badge ${badgeModifier}`}>
                          {t.statusLabel || t.status}
                        </span>
                      </td>
                      <td>{displayNumber(t.replyCount)} ta</td>
                      <td>{formatDateTime(t.createdAt)}</td>
                      <td className="ap-td-actions">
                        <button
                          type="button"
                          className="ap-btn ap-btn--small"
                          onClick={() => setSelectedTicket(t)}
                          title="Ko‘rish va javob qaytarish"
                        >
                          <Eye size={14} /> Ko‘rish
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={MessageSquareMore}
            title="Murojaat topilmadi"
            text="Hozircha tanlangan parametrlar bo‘yicha murojaat mavjud emas."
          />
        )}
      </section>

      {data && (
        <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticketId={selectedTicket.id}
          api={api}
          notify={notify}
          onClose={() => setSelectedTicket(null)}
          onUpdated={() => setReload((v) => v + 1)}
        />
      )}
    </div>
  )
}

function TicketDetailModal({ ticketId, api, notify, onClose, onUpdated }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')

  const loadDetail = useCallback(() => {
    setLoading(true)
    api(`/api/admin/support/tickets/${ticketId}`)
      .then((res) => {
        setData(res)
        setSelectedStatus(res.ticket.status)
      })
      .catch((err) => notify('error', errorText(err)))
      .finally(() => setLoading(false))
  }, [api, ticketId, notify])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const sendReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return
    setSubmittingReply(true)
    try {
      await api(`/api/admin/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        body: { message: replyText.trim() },
      })
      notify('success', 'Javob yuborildi.')
      setReplyText('')
      loadDetail()
      onUpdated()
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setSubmittingReply(false)
    }
  }

  const updateStatus = async (newStat) => {
    setChangingStatus(true)
    try {
      await api(`/api/admin/support/tickets/${ticketId}`, {
        method: 'PATCH',
        body: { status: newStat },
      })
      notify('success', 'Murojaat holati yangilandi.')
      setSelectedStatus(newStat)
      loadDetail()
      onUpdated()
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setChangingStatus(false)
    }
  }

  const ticket = data?.ticket

  return (
    <Modal title={ticket ? `Murojaat: ${ticket.subject}` : 'Murojaat'} onClose={onClose} wide>
      {loading && !data ? (
        <Skeleton rows={4} />
      ) : ticket ? (
        <div>
          <div className="ap-ticket-info">
            <span>Foydalanuvchi: <strong>{ticket.username}</strong> ({ticket.email})</span>
            <span>Turi: <strong>{ticket.type === 'complaint' ? 'Shikoyat' : 'Taklif'}</strong></span>
            <span>Sana: <strong>{formatDateTime(ticket.createdAt)}</strong></span>
            <span>Holat: <strong>{ticket.statusLabel}</strong></span>
          </div>

          <label className="ap-field" style={{ marginBottom: 6 }}>Foydalanuvchi xabari:</label>
          <div className="ap-ticket-message">{ticket.message}</div>

          <h4 style={{ margin: '18px 0 10px', fontSize: 14 }}>Javoblar tarixi ({data.replies.length}):</h4>
          {data.replies.length > 0 ? (
            <div className="ap-replies">
              {data.replies.map((r) => (
                <div key={r.id} className="ap-reply">
                  <div className="ap-reply__head">
                    <strong>🛡️ {r.adminUsername} (Admin)</strong>
                    <span>{formatDateTime(r.createdAt)}</span>
                  </div>
                  <div className="ap-reply__text">{r.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="ap-muted" style={{ fontSize: 13, margin: '8px 0 14px' }}>
              Hozircha admin javobi yo‘q.
            </p>
          )}

          <form onSubmit={sendReply} style={{ marginTop: 14 }}>
            <label className="ap-field">
              Foydalanuvchiga javob yozish:
              <textarea
                placeholder="Javobingizni bu yerga yozing..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                required
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="submit"
                className="ap-btn ap-btn--primary"
                disabled={submittingReply || !replyText.trim()}
              >
                <Send size={14} /> {submittingReply ? 'Yuborilmoqda…' : 'Javobni yuborish'}
              </button>
            </div>
          </form>

          <div className="ap-status-row">
            <label>Murojaat holati:</label>
            <select
              className="ap-select"
              value={selectedStatus}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={changingStatus}
            >
              <option value="new">Yangi</option>
              <option value="in_progress">Jarayonda</option>
              <option value="resolved">Hal qilindi</option>
              <option value="closed">Yopildi</option>
            </select>
            {changingStatus && <span className="ap-muted" style={{ fontSize: 12 }}>Saqlanmoqda…</span>}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

function FaqAdmin({ api, notify }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api('/api/admin/support/faq')
      .then((res) => {
        if (!cancelled) {
          setItems(res.items || [])
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [api, reload])

  const deleteFaq = async () => {
    if (!deletingItem) return
    setDeleteBusy(true)
    try {
      await api(`/api/admin/support/faq/${deletingItem.id}`, { method: 'DELETE', body: {} })
      notify('success', 'Savol o‘chirildi.')
      setDeletingItem(null)
      setReload((v) => v + 1)
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="ap-stack">
      <div className="ap-toolbar" style={{ justifyContent: 'space-between' }}>
        <p className="ap-muted" style={{ fontSize: 13 }}>
          Foydalanuvchilar «Qo‘llab-quvvatlash» sahifasida ko‘radigan savol-javoblar
        </p>
        <button
          type="button"
          className="ap-btn ap-btn--primary"
          onClick={() => setIsCreating(true)}
        >
          <Plus size={15} /> Yangi savol qo‘shish
        </button>
      </div>

      {error && (
        <div className="ap-alert" role="alert">
          <CircleAlert size={16} /> {error}
        </div>
      )}

      <section className="ap-card ap-card--flush">
        {loading && !items.length ? (
          <div className="ap-pad"><Skeleton /></div>
        ) : items.length ? (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Savol</th>
                  <th>Kategoriya</th>
                  <th>Tartib</th>
                  <th>Holat</th>
                  <th className="ap-th-actions">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.question}</strong>
                      <small style={{ maxWidth: 450, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.answer}
                      </small>
                    </td>
                    <td>
                      <span className="ap-badge">{item.category}</span>
                    </td>
                    <td>{item.sort_order}</td>
                    <td>
                      <span className={`ap-badge ${item.is_active ? 'ap-badge--ok' : 'ap-badge--danger'}`}>
                        {item.is_active ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td className="ap-td-actions">
                      <button
                        type="button"
                        className="ap-icon-btn"
                        onClick={() => setEditingItem(item)}
                        title="Tahrirlash"
                        aria-label="Tahrirlash"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="ap-icon-btn ap-icon-btn--danger"
                        onClick={() => setDeletingItem(item)}
                        title="O‘chirish"
                        aria-label="O‘chirish"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={HelpCircle}
            title="Savollar mavjud emas"
            text="«Yangi savol qo‘shish» tugmasi orqali ilk FAQ savolini kiriting."
          />
        )}
      </section>

      {isCreating && (
        <FaqFormModal
          onClose={() => setIsCreating(false)}
          api={api}
          notify={notify}
          onSaved={() => {
            setIsCreating(false)
            setReload((v) => v + 1)
          }}
        />
      )}

      {editingItem && (
        <FaqFormModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          api={api}
          notify={notify}
          onSaved={() => {
            setEditingItem(null)
            setReload((v) => v + 1)
          }}
        />
      )}

      {deletingItem && (
        <ConfirmDialog
          danger
          busy={deleteBusy}
          title="Savolni o‘chirish"
          confirmLabel="Ha, o‘chirish"
          onCancel={() => setDeletingItem(null)}
          onConfirm={deleteFaq}
          text={`«${deletingItem.question}» savoli butunlay o‘chiriladi.`}
        />
      )}
    </div>
  )
}

function FaqFormModal({ item, onClose, api, notify, onSaved }) {
  const isEdit = Boolean(item)
  const [question, setQuestion] = useState(item?.question || '')
  const [answer, setAnswer] = useState(item?.answer || '')
  const [category, setCategory] = useState(item?.category || 'Umumiy')
  const [sortOrder, setSortOrder] = useState(item?.sort_order ?? 0)
  const [isActive, setIsActive] = useState(item?.is_active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (isEdit) {
        await api(`/api/admin/support/faq/${item.id}`, {
          method: 'PATCH',
          body: { question, answer, category, sortOrder: Number(sortOrder), isActive },
        })
        notify('success', 'Savol yangilandi.')
      } else {
        await api('/api/admin/support/faq', {
          method: 'POST',
          body: { question, answer, category, sortOrder: Number(sortOrder) },
        })
        notify('success', 'Yangi savol qo‘shildi.')
      }
      onSaved()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Savolni tahrirlash' : 'Yangi savol qo‘shish'} onClose={onClose} wide>
      <form className="ap-form" onSubmit={submit}>
        <label className="ap-field">
          Savol *
          <input
            type="text"
            maxLength={500}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Masalan: Kitobni qanday qilib sevimlilarga qo‘shaman?"
            required
          />
        </label>

        <div className="ap-form__pair">
          <label className="ap-field">
            Kategoriya
            <input
              type="text"
              maxLength={100}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Umumiy, Mutolaa, Hisob..."
              required
            />
          </label>
          <label className="ap-field">
            Tartib raqami (kichigi oldin chiqadi)
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </label>
        </div>

        <label className="ap-field">
          Javob matni *
          <textarea
            maxLength={3000}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Batafsil tushuntirish yozing..."
            style={{ minHeight: 120 }}
            required
          />
        </label>

        {isEdit && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Saytda faol ko‘rsatilsin
          </label>
        )}

        {error && (
          <div className="ap-alert" role="alert">
            <CircleAlert size={15} /> {error}
          </div>
        )}

        <div className="ap-actions-row">
          <button type="button" className="ap-btn" onClick={onClose} disabled={busy}>
            Bekor qilish
          </button>
          <button type="submit" className="ap-btn ap-btn--primary" disabled={busy}>
            {busy ? 'Saqlanmoqda…' : isEdit ? 'O‘zgarishlarni saqlash' : 'Qo‘shish'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


/* ---------- Zaxira nusxalar bo'limi ---------- */

function BackupsSection({ api, notify }) {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadBackups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api('/api/admin/backups')
      setBackups(data.backups || [])
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setLoading(false)
    }
  }, [api, notify])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const data = await api('/api/admin/backups', { method: 'POST' })
      notify('success', `Zaxira muvaffaqiyatli yaratildi (${data.backup?.sizeFormatted || 'tayyor'})`)
      loadBackups()
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api(`/api/admin/backups/${encodeURIComponent(deleteTarget.filename)}`, { method: 'DELETE' })
      notify('success', 'Zaxira nusxasi o‘chirildi.')
      setDeleteTarget(null)
      loadBackups()
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="ap-section">
      <div className="ap-section__head">
        <div>
          <h2>Ma’lumotlar bazasi zaxira nusxalari</h2>
          <p>Foydalanuvchilar, kitoblar, mutolaa jurnali va sharhlar to‘liq arxivlangan holatda saqlanadi</p>
        </div>
        <button
          type="button"
          className="ap-btn ap-btn--primary"
          onClick={handleCreateBackup}
          disabled={creating}
        >
          <HardDrive size={15} />
          {creating ? 'Zaxiralanmoqda…' : 'Hozir zaxira nusxa olish'}
        </button>
      </div>

      <div className="ap-stats-grid" style={{ marginBottom: 20 }}>
        <div className="ap-stat-card">
          <span>Mavjud zaxiralar</span>
          <strong>{backups.length} ta</strong>
          <small>Maksimal 15 ta nusxa saqlanadi</small>
        </div>
        <div className="ap-stat-card">
          <span>Oxirgi zaxira</span>
          <strong>{backups[0] ? formatDateTime(backups[0].createdAt) : 'Mavjud emas'}</strong>
          <small>{backups[0] ? backups[0].sizeFormatted : '—'}</small>
        </div>
        <div className="ap-stat-card">
          <span>Avtomatik rejim</span>
          <strong style={{ color: '#566d65' }}>Har 24 soatda faol</strong>
          <small>Server har kecha avtomatik zaxiralaydi</small>
        </div>
      </div>

      {loading ? (
        <Skeleton rows={4} />
      ) : backups.length === 0 ? (
        <Empty
          icon={HardDrive}
          title="Zaxira nusxalar hali yo‘q"
          text="Yuqoridagi tugmani bosib birinchi to‘liq zaxirani yarating."
        />
      ) : (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Fayl nomi</th>
                <th>Yaratilgan vaqti</th>
                <th>Hajmi</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.filename}>
                  <td>
                    <strong>{b.filename}</strong>
                  </td>
                  <td>{formatDateTime(b.createdAt)}</td>
                  <td><span className="ap-tag">{b.sizeFormatted}</span></td>
                  <td>
                    <div className="ap-row-actions">
                      <a
                        href={`/api/admin/backups/${encodeURIComponent(b.filename)}/download`}
                        download={b.filename}
                        className="ap-btn ap-btn--small"
                        title="Kompyuterga yuklab olish"
                      >
                        <Download size={13} /> Yuklab olish
                      </a>
                      <button
                        type="button"
                        className="ap-btn ap-btn--small ap-btn--danger"
                        onClick={() => setDeleteTarget(b)}
                        title="O‘chirish"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Zaxira nusxasini o‘chirish"
          text={`Rostdan ham "${deleteTarget.filename}" faylini butunlay o‘chirmoqchimisiz?`}
          confirmLabel="O‘chirish"
          danger
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  )
}

/* ---------- Reklama va Monetizatsiya bo'limi ---------- */

function AdsSection({ api, notify }) {
  const [banners, setBanners] = useState([])
  const [adsense, setAdsense] = useState({ clientId: '', enabled: false })
  const [loading, setLoading] = useState(true)
  const [savingAdsense, setSavingAdsense] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    placement: 'all',
    isActive: true,
  })
  const [creating, setCreating] = useState(false)

  const loadAds = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api('/api/admin/ads')
      setBanners(data.banners || [])
      setAdsense(data.adsense || { clientId: '', enabled: false })
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setLoading(false)
    }
  }, [api, notify])

  useEffect(() => {
    loadAds()
  }, [loadAds])

  const handleSaveAdsense = async (e) => {
    e.preventDefault()
    setSavingAdsense(true)
    try {
      await api('/api/admin/ads/adsense-config', {
        method: 'POST',
        body: adsense,
      })
      notify('success', 'Google AdSense sozlamalari muvaffaqiyatli saqlandi!')
      loadAds()
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setSavingAdsense(false)
    }
  }

  const handleCreateBanner = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.linkUrl.trim()) {
      notify('error', 'Sarlavha va havola (link) kiritilishi shart.')
      return
    }
    setCreating(true)
    try {
      await api('/api/admin/ads', {
        method: 'POST',
        body: form,
      })
      notify('success', 'Yangi reklama banneri muvaffaqiyatli qo‘shildi!')
      setModalOpen(false)
      setForm({ title: '', imageUrl: '', linkUrl: '', placement: 'all', isActive: true })
      loadAds()
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (banner) => {
    try {
      await api(`/api/admin/ads/${banner.id}`, {
        method: 'PATCH',
        body: { isActive: !banner.isActive },
      })
      notify('success', `Reklama ${!banner.isActive ? 'faollashtirildi' : 'to‘xtatildi'}.`)
      loadAds()
    } catch (err) {
      notify('error', errorText(err))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api(`/api/admin/ads/${deleteTarget.id}`, { method: 'DELETE' })
      notify('success', 'Reklama banneri o‘chirildi.')
      setDeleteTarget(null)
      loadAds()
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setDeleting(false)
    }
  }

  const totalViews = banners.reduce((sum, b) => sum + (b.viewsCount || 0), 0)
  const totalClicks = banners.reduce((sum, b) => sum + (b.clicksCount || 0), 0)
  const averageCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Google AdSense kartasi */}
      <section className="ap-section">
        <div className="ap-section__head">
          <div>
            <h2>Google AdSense integratsiyasi</h2>
            <p>Google tomonidan berilgan Publisher ID (ca-pub-...) orqali avtomatik reklamalarni yoqing</p>
          </div>
          <span className={`ap-tag ${adsense.enabled && adsense.clientId ? 'ap-tag--active' : ''}`}>
            {adsense.enabled && adsense.clientId ? '● AdSense Faol' : '○ AdSense Nofaol'}
          </span>
        </div>

        <form onSubmit={handleSaveAdsense} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
          <label className="ap-label">
            <span>Google AdSense Publisher ID (Mijoz ID)</span>
            <input
              type="text"
              placeholder="Masalan: ca-pub-1234567890123456"
              value={adsense.clientId}
              onChange={(e) => setAdsense({ ...adsense, clientId: e.target.value.trim() })}
              className="ap-input"
            />
            <small style={{ color: 'var(--muted)', marginTop: 4, display: 'block' }}>
              Ushbu ID kiritilishi bilan saytingizda avtomatik <code>e-kitobxon.uz/ads.txt</code> fayli shakllanadi.
            </small>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: '4px 0' }}>
            <input
              type="checkbox"
              checked={adsense.enabled}
              onChange={(e) => setAdsense({ ...adsense, enabled: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <strong>Google AdSense avtomatik reklamalarini (Auto Ads) saytda ko‘rsatish</strong>
          </label>

          <div>
            <button type="submit" className="ap-btn ap-btn--primary" disabled={savingAdsense}>
              {savingAdsense ? 'Saqlanmoqda…' : 'AdSense sozlamasini saqlash'}
            </button>
          </div>
        </form>
      </section>

      {/* 2. Ichki Homiy va Banner reklamalari */}
      <section className="ap-section">
        <div className="ap-section__head">
          <div>
            <h2>Homiylik va Hamkorlik bannerlari</h2>
            <p>O‘zingiz istagan kitob do‘konlari, o‘quv markazlari yoki homiylar bannerlarini joylashtiring</p>
          </div>
          <button
            type="button"
            className="ap-btn ap-btn--primary"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={15} /> Yangi reklama qo‘shish
          </button>
        </div>

        <div className="ap-stats-grid" style={{ marginBottom: 20 }}>
          <div className="ap-stat-card">
            <span>Jami ko‘rishlar</span>
            <strong>{displayNumber(totalViews)}</strong>
            <small>Foydalanuvchilar ko‘rgan marta</small>
          </div>
          <div className="ap-stat-card">
            <span>Jami bosishlar</span>
            <strong>{displayNumber(totalClicks)}</strong>
            <small>Havolaga o‘tilgan marta</small>
          </div>
          <div className="ap-stat-card">
            <span>O‘rtacha samaradorlik (CTR)</span>
            <strong style={{ color: '#566d65' }}>{averageCtr}%</strong>
            <small>Bosishlar foizi</small>
          </div>
        </div>

        {loading ? (
          <Skeleton rows={4} />
        ) : banners.length === 0 ? (
          <Empty
            icon={Megaphone}
            title="Hali reklamalar yo‘q"
            text="«Yangi reklama qo‘shish» tugmasini bosib birinchi homiylik bannerini joylashtiring."
          />
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Sarlavha va havola</th>
                  <th>Joylashuv</th>
                  <th>Ko‘rishlar</th>
                  <th>Bosishlar</th>
                  <th>CTR</th>
                  <th>Holat</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.title}</strong>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        <a href={b.linkUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                          {b.linkUrl.slice(0, 45)}…
                        </a>
                      </div>
                    </td>
                    <td>
                      <span className="ap-tag">
                        {b.placement === 'home_top' ? 'Bosh sahifa' : b.placement === 'book_detail' ? 'Kitob sahifasi' : 'Barcha sahifalar'}
                      </span>
                    </td>
                    <td>{displayNumber(b.viewsCount)}</td>
                    <td>{displayNumber(b.clicksCount)}</td>
                    <td><strong>{b.ctr}%</strong></td>
                    <td>
                      <button
                        type="button"
                        className={`ap-btn ap-btn--small ${b.isActive ? 'ap-btn--success' : ''}`}
                        onClick={() => handleToggleActive(b)}
                        style={{ minWidth: 70 }}
                      >
                        {b.isActive ? 'Faol' : 'To‘xtatilgan'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ap-btn ap-btn--small ap-btn--danger"
                        onClick={() => setDeleteTarget(b)}
                        title="O‘chirish"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Banner qo'shish modali */}
      {modalOpen && (
        <Modal title="Yangi reklama / homiylik banneri qo‘shish" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreateBanner} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="ap-label">
              <span>Sarlavha (Kompaniya yoki kitob nomi) *</span>
              <input
                type="text"
                maxLength={200}
                placeholder="Masalan: Asaxiy Books — Yangi kitoblar yarmarkasi"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="ap-input"
                required
              />
            </label>

            <label className="ap-label">
              <span>O‘tish havolasi (Sayt yoki Telegram kanal) *</span>
              <input
                type="url"
                placeholder="https://t.me/kanal yoki https://sayt.uz"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                className="ap-input"
                required
              />
            </label>

            <label className="ap-label">
              <span>Rasm / Banner havolasi (Image URL, ixtiyoriy)</span>
              <input
                type="url"
                placeholder="https://example.com/banner.png"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="ap-input"
              />
            </label>

            <label className="ap-label">
              <span>Joylashuvi</span>
              <select
                value={form.placement}
                onChange={(e) => setForm({ ...form, placement: e.target.value })}
                className="ap-select"
              >
                <option value="all">Barcha sahifalarda</option>
                <option value="home_top">Bosh sahifada</option>
                <option value="book_detail">Kitob tafsiloti sahifasida</option>
                <option value="reader_side">Mutolaa sahifasida</option>
              </select>
            </label>

            <div className="ap-actions-row" style={{ marginTop: 10 }}>
              <button type="button" className="ap-btn" onClick={() => setModalOpen(false)}>
                Bekor qilish
              </button>
              <button type="submit" className="ap-btn ap-btn--primary" disabled={creating}>
                {creating ? 'Qo‘shilmoqda…' : 'Bannerni saqlash'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* O'chirish tasdiqlash dialogi */}
      {deleteTarget && (
        <ConfirmDialog
          title="Reklamani o‘chirish"
          text={`Rostdan ham "${deleteTarget.title}" reklamasini o‘chirmoqchimisiz?`}
          confirmLabel="O‘chirish"
          danger
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

/* ---------- Asosiy panel ---------- */

const TABS = [
  ['overview', 'Boshqaruv', LayoutDashboard, 'Statistika va umumiy ko‘rinish'],
  ['books', 'Kitoblar', BookCopy, 'Kutubxonani boshqarish'],
  ['users', 'Foydalanuvchilar', UsersRound, 'Akkauntlarni boshqarish'],
  ['audit', 'Faoliyat jurnali', ScrollText, 'Adminlar bajargan amallar'],
  ['support', 'Qo‘llab-quvvatlash', MessageSquareMore, 'Murojaatlar va ko‘p beriladigan savollar'],
  ['backups', 'Zaxira nusxalar', HardDrive, 'Ma’lumotlar bazasi zaxira nusxalarini boshqarish'],
  ['ads', 'Reklama va Daromad', Megaphone, 'Google AdSense va homiylik bannerlarini boshqarish'],
]

function tabFromHash() {
  const hash = window.location.hash.replace('#', '')
  return TABS.some(([id]) => id === hash) ? hash : 'overview'
}

function AdminDashboard({
  stats, books = [], month = '', onMonthChange, onRefresh, onUpload, onBooksChanged,
  loading = false, error, request, onNavigate, onLogout, currentUser,
}) {
  const [tab, setTab] = useState(tabFromHash)
  const [toast, setToast] = useState(null)

  // `request` har renderda yangi bo‘lishi mumkin, shuning uchun barqaror funksiya yasaymiz
  const requestRef = useRef(request)
  requestRef.current = request
  const api = useCallback((path, options) => requestRef.current(path, options), [])
  const notify = useCallback((type, text) => setToast({ type, text, id: Date.now() }), [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const openTab = (id) => {
    setTab(id)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`)
    window.scrollTo({ top: 0 })
  }
  const current = TABS.find(([id]) => id === tab) || TABS[0]

  return (
    <div className="ap">
      <aside className="ap-side">
        <div className="ap-brand"><span className="ap-brand__mark"><BookOpen size={17} /></span><div><strong>Kitobxon</strong><small>Admin panel</small></div></div>
        <nav className="ap-nav" aria-label="Admin bo‘limlari">
          {TABS.map(([id, label, Icon]) => (
            <button key={id} type="button" className={tab === id ? 'is-active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => openTab(id)}>
              <Icon size={17} /> <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="ap-side__foot">
          <div className="ap-me" title={currentUser?.email}><span>{(currentUser?.username || 'A').slice(0, 2).toUpperCase()}</span><div><strong>{currentUser?.username}</strong><small>Administrator</small></div></div>
          <a href="/" className="ap-side__link" onClick={(event) => { event.preventDefault(); onNavigate?.('/') }}><ArrowLeft size={15} /> <span>Saytga qaytish</span></a>
          <button type="button" className="ap-side__link" onClick={() => onLogout?.()}><LogOut size={15} /> <span>Chiqish</span></button>
        </div>
      </aside>

      <main className="ap-main">
        <header className="ap-head">
          <h1>{current[1]}</h1>
          <p>{current[3]}</p>
        </header>
        {tab === 'overview' && <Overview stats={stats} month={month} onMonthChange={onMonthChange} onRefresh={onRefresh} loading={loading} error={error} api={api} />}
        {tab === 'books' && <BooksSection books={books} loading={loading} onUpload={onUpload} onChanged={onBooksChanged} api={api} notify={notify} />}
        {tab === 'users' && <UsersSection api={api} notify={notify} currentUser={currentUser} />}
        {tab === 'audit' && <AuditSection api={api} />}
        {tab === 'support' && <SupportSection api={api} notify={notify} />}
        {tab === 'backups' && <BackupsSection api={api} notify={notify} />}
        {tab === 'ads' && <AdsSection api={api} notify={notify} />}
      </main>

      {toast && (
        <div key={toast.id} className={`ap-toast ap-toast--${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
          {toast.type === 'error' ? <CircleAlert size={16} /> : <Check size={16} />} {toast.text}
          <button type="button" className="ap-icon-btn" onClick={() => setToast(null)} aria-label="Yopish"><X size={14} /></button>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
