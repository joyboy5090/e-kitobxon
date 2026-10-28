import React, { useCallback, useEffect, useState } from 'react'
import { CircleAlert, Eye, HelpCircle, MessageSquareMore, Pencil, Plus, Search, Send, Trash2 } from 'lucide-react'
import { ConfirmDialog, displayNumber, Empty, errorText, formatDateTime, Modal, Pager, Skeleton, useDebounced } from './AdminCommon.jsx'

export function SupportSection({ api, notify }) {
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
