import React, { useMemo, useState } from 'react'
import { BookCopy, CircleAlert, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
import { ConfirmDialog, displayNumber, Empty, errorText, formatDate, Modal, Skeleton } from './AdminCommon.jsx'

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

export function BooksSection({ books, loading, onUpload, onChanged, api, notify }) {
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
