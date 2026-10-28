import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, BookCopy, BookOpen, Check, CircleAlert, HardDrive,
  LayoutDashboard, LogOut, Megaphone, MessageSquareMore, ScrollText, UsersRound, X
} from 'lucide-react'
import './admin-panel.css'
import { OverviewSection } from './admin/OverviewSection.jsx'
import { BooksSection } from './admin/BooksSection.jsx'
import { UsersSection } from './admin/UsersSection.jsx'
import { AuditSection } from './admin/AuditSection.jsx'
import { SupportSection } from './admin/SupportSection.jsx'
import { BackupsSection } from './admin/BackupsSection.jsx'
import { AdsSection } from './admin/AdsSection.jsx'

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
        <div className="ap-brand">
          <span className="ap-brand__mark"><BookOpen size={17} /></span>
          <div><strong>Kitobxon</strong><small>Admin panel</small></div>
        </div>
        <nav className="ap-nav" aria-label="Admin bo‘limlari">
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'is-active' : ''}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => openTab(id)}
            >
              <Icon size={17} /> <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="ap-side__foot">
          <div className="ap-me" title={currentUser?.email}>
            <span>{(currentUser?.username || 'A').slice(0, 2).toUpperCase()}</span>
            <div><strong>{currentUser?.username}</strong><small>Administrator</small></div>
          </div>
          <a href="/" className="ap-side__link" onClick={(event) => { event.preventDefault(); onNavigate?.('/') }}>
            <ArrowLeft size={15} /> <span>Saytga qaytish</span>
          </a>
          <button type="button" className="ap-side__link" onClick={() => onLogout?.()}>
            <LogOut size={15} /> <span>Chiqish</span>
          </button>
        </div>
      </aside>

      <main className="ap-main">
        <header className="ap-head">
          <h1>{current[1]}</h1>
          <p>{current[3]}</p>
        </header>
        {tab === 'overview' && (
          <OverviewSection stats={stats} month={month} onMonthChange={onMonthChange} onRefresh={onRefresh} loading={loading} error={error} api={api} />
        )}
        {tab === 'books' && (
          <BooksSection books={books} loading={loading} onUpload={onUpload} onChanged={onBooksChanged} api={api} notify={notify} />
        )}
        {tab === 'users' && (
          <UsersSection api={api} notify={notify} currentUser={currentUser} />
        )}
        {tab === 'audit' && (
          <AuditSection api={api} />
        )}
        {tab === 'support' && (
          <SupportSection api={api} notify={notify} />
        )}
        {tab === 'backups' && (
          <BackupsSection api={api} notify={notify} />
        )}
        {tab === 'ads' && (
          <AdsSection api={api} notify={notify} />
        )}
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
