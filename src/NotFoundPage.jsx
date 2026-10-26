import React, { useState } from 'react'
import { BookX, Home, Search, HelpCircle, ArrowLeft } from 'lucide-react'
import './not-found.css'

export default function NotFoundPage({ onNavigate }) {
  const [query, setQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim() && onNavigate) {
      onNavigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const goTo = (path) => {
    if (onNavigate) onNavigate(path)
  }

  return (
    <div className="nf-page fade-in">
      <div className="nf-card">
        <div className="nf-code">
          <span>4</span>
          <span className="nf-book-icon">
            <BookX size={32} />
          </span>
          <span>4</span>
        </div>

        <h1 className="nf-title">Ushbu sahifa topilmadi</h1>
        <p className="nf-desc">
          Kechirasiz, siz murojaat qilgan manzil mavjud emas, nomi o‘zgargan yoki vaqtinchalik
          olib tashlangan bo‘lishi mumkin. Xuddi yo‘qolgan kitob sahifasiga o‘xshaydi…
        </p>

        <div className="nf-actions">
          <button
            type="button"
            className="button-primary"
            onClick={() => goTo('/')}
            style={{ gap: 8, padding: '11px 20px' }}
          >
            <Home size={16} /> Bosh sahifaga qaytish
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => goTo('/search')}
            style={{ gap: 8, padding: '11px 18px' }}
          >
            <Search size={16} /> Kitoblar katalogi
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => goTo('/support')}
            style={{ gap: 8, padding: '11px 18px' }}
          >
            <HelpCircle size={16} /> Yordam markazi
          </button>
        </div>

        <div className="nf-search-box">
          <p>Yoki o‘zingiz qidirayotgan kitobni to‘g‘ridan-to‘g‘ri qidirib ko‘ring:</p>
          <form className="search-form" onSubmit={handleSearch} style={{ margin: '0 auto' }}>
            <Search size={17} color="#9b8c7e" />
            <input
              type="search"
              aria-label="Kitob qidirish"
              placeholder="Kitob nomi yoki muallif..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="button-primary" type="submit">
              Qidirish
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
