import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export const numberFormat = new Intl.NumberFormat('uz-UZ')

export const displayNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? numberFormat.format(parsed) : '—'
}

export const errorText = (error) => {
  if (!error) return ''
  return typeof error === 'string' ? error : error.message || 'Xatolik yuz berdi.'
}

export const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}

export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function Modal({ title, onClose, children, wide = false }) {
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

export function ConfirmDialog({ title, text, confirmLabel, danger = false, busy, onConfirm, onCancel }) {
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

export function Pager({ page, pageSize, total, onPage }) {
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

export function Empty({ icon: Icon, title, text }) {
  return (
    <div className="ap-empty">
      <span><Icon size={20} /></span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  )
}

export function Skeleton({ rows = 4 }) {
  return <div className="ap-skeletons" aria-busy="true">{Array.from({ length: rows }, (_unused, i) => <span key={i} className="ap-skeleton" />)}</div>
}
