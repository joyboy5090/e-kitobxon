import React, { useEffect, useState } from 'react'
import {
  ChevronDown,
  CircleHelp,
  MessageSquarePlus,
  MessagesSquare,
  Send,
  Clock,
  CheckCircle2,
  CircleAlert,
  XCircle,
  LogIn,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Mail,
  ExternalLink,
  Headphones
} from 'lucide-react'
import './support.css'

async function apiRequest(path, { method = 'GET', body, csrfToken } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    headers['X-Kitobxon-Request'] = '1'
    headers['X-CSRF-Token'] = csrfToken || ''
  }
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'So‘rovni bajarib bo‘lmadi.')
  return data
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Intl.DateTimeFormat('uz-UZ', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

export default function SupportPage({ user, csrfToken, onSignIn }) {
  // FAQ state
  const [faqs, setFaqs] = useState([])
  const [faqsLoading, setFaqsLoading] = useState(true)
  const [openFaqId, setOpenFaqId] = useState(null)

  // Ticket yuborish formasi state
  const [ticketType, setTicketType] = useState('suggestion')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formNotice, setFormNotice] = useState(null)

  // Mening murojaatlarim state
  const [myTickets, setMyTickets] = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [openTicketId, setOpenTicketId] = useState(null)
  const [ticketDetails, setTicketDetails] = useState({}) // ticketId -> { ticket, replies }
  const [detailsLoading, setDetailsLoading] = useState({})

  // FAQ yuklash
  useEffect(() => {
    let cancelled = false
    apiRequest('/api/support/faq')
      .then((data) => {
        if (!cancelled && data?.items) {
          setFaqs(data.items)
          // Birinchi savolni avtomatik ochiq qilish
          if (data.items.length > 0) {
            setOpenFaqId(data.items[0].id)
          }
        }
      })
      .catch((err) => console.error('FAQ yuklanmadi:', err))
      .finally(() => {
        if (!cancelled) setFaqsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Foydalanuvchining o'z murojaatlarini yuklash
  const loadMyTickets = () => {
    if (!user) return
    setTicketsLoading(true)
    apiRequest('/api/support/tickets')
      .then((data) => {
        if (data?.tickets) setMyTickets(data.tickets)
      })
      .catch((err) => console.error('Murojaatlar yuklanmadi:', err))
      .finally(() => setTicketsLoading(false))
  }

  useEffect(() => {
    if (user) {
      loadMyTickets()
    }
  }, [user])

  // FAQ accordion ochish/yopish
  const toggleFaq = (id) => {
    setOpenFaqId((prev) => (prev === id ? null : id))
  }

  // Murojaat tafsilotlarini yuklash
  const toggleTicket = async (ticketId) => {
    if (openTicketId === ticketId) {
      setOpenTicketId(null)
      return
    }
    setOpenTicketId(ticketId)
    if (!ticketDetails[ticketId]) {
      setDetailsLoading((prev) => ({ ...prev, [ticketId]: true }))
      try {
        const data = await apiRequest(`/api/support/tickets/${ticketId}`)
        setTicketDetails((prev) => ({ ...prev, [ticketId]: data }))
      } catch (err) {
        console.error('Ticket tafsiloti yuklanmadi:', err)
      } finally {
        setDetailsLoading((prev) => ({ ...prev, [ticketId]: false }))
      }
    }
  }

  // Yangi murojaat yuborish
  const handleSubmitTicket = async (e) => {
    e.preventDefault()
    setFormNotice(null)

    if (!subject.trim()) {
      setFormNotice({ type: 'error', text: 'Iltimos, mavzuni kiriting.' })
      return
    }
    if (!message.trim()) {
      setFormNotice({ type: 'error', text: 'Iltimos, xabaringizni yozing.' })
      return
    }

    setSubmitting(true)
    try {
      const res = await apiRequest('/api/support/tickets', {
        method: 'POST',
        body: { type: ticketType, subject: subject.trim(), message: message.trim() },
        csrfToken,
      })

      setFormNotice({
        type: 'success',
        text: 'Murojaatingiz muvaffaqiyatli yuborildi! Admin tez orada ko‘rib chiqadi.',
      })
      setSubject('')
      setMessage('')
      // Ro'yxatni yangilash
      loadMyTickets()
    } catch (err) {
      setFormNotice({ type: 'error', text: err.message || 'Xatolik yuz berdi.' })
    } finally {
      setSubmitting(false)
    }
  }

  // FAQlarni kategoriyalar bo'yicha guruhlash
  const faqCategories = faqs.reduce((acc, item) => {
    const cat = item.category || 'Umumiy'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="sp-page fade-in">
      <header className="sp-hero">
        <div className="sp-eyebrow">
          <HelpCircle size={15} /> Qo‘llab-quvvatlash xizmati
        </div>
        <h1>Sizga qanday yordam bera olamiz?</h1>
        <p>
          Ko‘p uchraydigan savollarga javob topishingiz, kitoblar yoki tizim bo‘yicha taklif va
          shikoyatlaringizni to‘g‘ridan-to‘g‘ri ma’muriyatga yuborishingiz mumkin.
        </p>
      </header>

      <div className="sp-layout">
        {/* Chap ustun: FAQ va Murojaatlar tarixi */}
        <div className="sp-main-col">
          {/* FAQ bo'limi */}
          <section className="sp-section">
            <div className="sp-section-head">
              <div className="sp-section-head__icon">
                <CircleHelp size={20} />
              </div>
              <div>
                <h2>Ko‘p beriladigan savollar (FAQ)</h2>
                <p>Kutubxonadan foydalanish bo‘yicha eng mashhur savollar va yechimlar</p>
              </div>
            </div>

            {faqsLoading ? (
              <div className="sp-loading">Savollar yuklanmoqda…</div>
            ) : faqs.length === 0 ? (
              <div className="sp-empty">
                <CircleHelp size={28} />
                <p>Hozircha savollar kiritilmagan.</p>
              </div>
            ) : (
              Object.entries(faqCategories).map(([category, items]) => (
                <div key={category} className="sp-faq-group">
                  <div className="sp-faq-group__title">
                    <Sparkles size={12} /> {category}
                  </div>
                  <div className="sp-faq-items">
                    {items.map((item) => {
                      const isOpen = openFaqId === item.id
                      return (
                        <div key={item.id} className={`sp-faq-item ${isOpen ? 'is-open' : ''}`}>
                          <button
                            type="button"
                            className="sp-faq-item__question"
                            onClick={() => toggleFaq(item.id)}
                            aria-expanded={isOpen}
                          >
                            <span>{item.question}</span>
                            <ChevronDown size={18} className="sp-faq-item__icon" />
                          </button>
                          <div className="sp-faq-item__answer">
                            <p>{item.answer}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Mening murojaatlarim bo'limi */}
          {user && (
            <section className="sp-section">
              <div className="sp-section-head">
                <div className="sp-section-head__icon">
                  <MessagesSquare size={20} />
                </div>
                <div>
                  <h2>Mening murojaatlarim</h2>
                  <p>Yuborgan taklif va shikoyatlaringiz holati hamda admin javoblari</p>
                </div>
              </div>

              {ticketsLoading ? (
                <div className="sp-loading">Murojaatlaringiz yuklanmoqda…</div>
              ) : myTickets.length === 0 ? (
                <div className="sp-empty">
                  <MessagesSquare size={28} />
                  <p>Siz hali murojaat yubormagansiz.</p>
                </div>
              ) : (
                <div className="sp-tickets-list">
                  {myTickets.map((t) => {
                    const isOpen = openTicketId === t.id
                    const detail = ticketDetails[t.id]
                    const isLoadingDetail = detailsLoading[t.id]

                    let badgeClass = 'sp-badge--new'
                    if (t.status === 'in_progress') badgeClass = 'sp-badge--in_progress'
                    else if (t.status === 'resolved') badgeClass = 'sp-badge--resolved'
                    else if (t.status === 'closed') badgeClass = 'sp-badge--closed'

                    return (
                      <div key={t.id} className="sp-ticket">
                        <button
                          type="button"
                          className="sp-ticket__header"
                          onClick={() => toggleTicket(t.id)}
                        >
                          <div>
                            <div className="sp-ticket__title-row">
                              <span
                                className={`sp-type-badge sp-type-badge--${t.type}`}
                              >
                                {t.type === 'complaint' ? 'Shikoyat' : 'Taklif'}
                              </span>
                              <span className="sp-ticket__subject">{t.subject}</span>
                            </div>
                            <div className="sp-ticket__meta">
                              <span>{formatDate(t.createdAt)}</span>
                              {t.replyCount > 0 && (
                                <span>• {t.replyCount} ta javob</span>
                              )}
                            </div>
                          </div>

                          <div className="sp-ticket__meta-right">
                            <span className={`sp-badge ${badgeClass}`}>
                              {t.statusLabel || t.status}
                            </span>
                            <ChevronDown
                              size={16}
                              style={{
                                transform: isOpen ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s',
                              }}
                            />
                          </div>
                        </button>

                        {isOpen && (
                          <div className="sp-ticket__body">
                            <div className="sp-ticket__message">
                              <strong>Murojaat matni:</strong>
                              <br />
                              {t.message}
                            </div>

                            {isLoadingDetail ? (
                              <div className="sp-loading">Javoblar tekshirilmoqda…</div>
                            ) : detail?.replies && detail.replies.length > 0 ? (
                              <div className="sp-ticket__replies">
                                <div className="sp-ticket__replies-title">
                                  Ma’muriyat javoblari:
                                </div>
                                {detail.replies.map((reply) => (
                                  <div key={reply.id} className="sp-reply">
                                    <div className="sp-reply__head">
                                      <span className="sp-reply__author">
                                        🛡️ {reply.adminUsername || 'Administrator'}
                                      </span>
                                      <span>{formatDate(reply.createdAt)}</span>
                                    </div>
                                    <div className="sp-reply__text">{reply.message}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="sp-reply" style={{ background: '#faf6f0' }}>
                                <small style={{ color: 'var(--muted)' }}>
                                  ⏳ Ma’muriyat tez orada ushbu murojaatni ko‘rib chiqib javob
                                  qaytaradi.
                                </small>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* O'ng ustun: Aloqa va Murojaat yuborish */}
        <div className="sp-side-col">
          {/* To'g'ridan-to'g'ri aloqa */}
          <section className="sp-section">
            <div className="sp-section-head">
              <div className="sp-section-head__icon">
                <Headphones size={20} />
              </div>
              <div>
                <h2>To‘g‘ridan-to‘g‘ri aloqa</h2>
                <p>Tezkor savollar va hamkorlik uchun</p>
              </div>
            </div>

            <div className="sp-contact-list">
              <a
                href="https://t.me/quvondiq0903"
                target="_blank"
                rel="noreferrer"
                className="sp-contact-card"
              >
                <div className="sp-contact-card__icon sp-contact-card__icon--tg">
                  <Send size={18} />
                </div>
                <div className="sp-contact-card__info">
                  <span className="sp-contact-card__label">Telegram orqali</span>
                  <strong className="sp-contact-card__value">@quvondiq0903</strong>
                  <span className="sp-contact-card__hint">Tezkor onlayn javob</span>
                </div>
                <ExternalLink size={15} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />
              </a>

              <a
                href="mailto:quvondiq5090@gmail.com"
                className="sp-contact-card"
              >
                <div className="sp-contact-card__icon sp-contact-card__icon--mail">
                  <Mail size={18} />
                </div>
                <div className="sp-contact-card__info">
                  <span className="sp-contact-card__label">Elektron pochta</span>
                  <strong className="sp-contact-card__value">quvondiq5090@gmail.com</strong>
                  <span className="sp-contact-card__hint">Rasmiy xatlar uchun</span>
                </div>
                <ExternalLink size={15} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />
              </a>
            </div>
          </section>

          <section className="sp-section">
            <div className="sp-section-head">
              <div className="sp-section-head__icon">
                <MessageSquarePlus size={20} />
              </div>
              <div>
                <h2>Murojaat yuborish</h2>
                <p>Taklif, shikoyat yoki xatolik haqida xabar bering</p>
              </div>
            </div>

            {!user ? (
              <div className="sp-login-prompt">
                <p>
                  Murojaat yuborish va admin javobini kuzatib borish uchun avval tizimga kiring.
                </p>
                <button
                  type="button"
                  className="button-primary"
                  onClick={onSignIn}
                  style={{ width: '100%', gap: '8px' }}
                >
                  <LogIn size={16} /> Tizimga kirish
                </button>
              </div>
            ) : (
              <form className="sp-form" onSubmit={handleSubmitTicket}>
                <label className="sp-field">
                  Murojaat turi
                  <select
                    value={ticketType}
                    onChange={(e) => setTicketType(e.target.value)}
                    required
                  >
                    <option value="suggestion">💡 Taklif yoki istak</option>
                    <option value="complaint">⚠️ Shikoyat yoki xatolik</option>
                  </select>
                </label>

                <label className="sp-field">
                  Mavzu
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="Qisqacha mazmuni (masalan: Yangi kitob taklifi)"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </label>

                <label className="sp-field">
                  Xabar matni
                  <textarea
                    maxLength={3000}
                    placeholder="Batafsil yozib bering. Qaysi kitob yoki sahifada muammo yuz berdi?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </label>

                {formNotice && (
                  <div
                    className={`sp-form-notice sp-form-notice--${formNotice.type}`}
                    role="alert"
                  >
                    {formNotice.type === 'error' ? (
                      <AlertCircle size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    <span>{formNotice.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="button-primary sp-submit"
                  disabled={submitting}
                  style={{ width: '100%', gap: '8px', padding: '12px' }}
                >
                  <Send size={15} />
                  {submitting ? 'Yuborilmoqda…' : 'Murojaatni yuborish'}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
