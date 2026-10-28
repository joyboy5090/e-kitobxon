import React from 'react'
import { BookOpen, Heart, ShoppingCart, Star } from 'lucide-react'
import { BookCover, SectionHeading } from '../components/BookCard.jsx'
import { BookReviews } from '../components/BookReviews.jsx'
import { Link } from '../components/common/Link.jsx'
import AdBanner from '../AdBanner.jsx'

export function BookDetailPage({ book, favorites, readingList, reading, onFavorite, onCart, onStart, user, csrfToken, onSignIn }) {
  if (!book) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <BookOpen size={30} />
          <h2>Kitob topilmadi</h2>
          <p>Bu kitob katalogda mavjud emas.</p>
          <Link href="/search" className="button-primary">Kitoblarga qaytish</Link>
        </div>
      </div>
    )
  }

  const progress = reading[book.id]

  return (
    <div className="page-content">
      <div className="detail-layout">
        <div className="detail-cover-stage"><BookCover book={book} /></div>
        <div className="detail-copy">
          <div className="section-kicker">{book.group} · {book.genre}</div>
          <h1>{book.title}</h1>
          <div className="detail-author">{book.author}</div>
          <span className="rating">
            <Star size={15} fill="currentColor" strokeWidth={0} />{book.rating}{' '}
            <span style={{ color: '#9b8e83', fontWeight: 400 }}>· o‘quvchilar bahosi</span>
          </span>
          <div className="detail-meta">
            <div className="meta-item"><span>Hajmi</span><span>{book.pages} sahifa</span></div>
            <div className="meta-item"><span>Nashr</span><span>{book.published}</span></div>
            <div className="meta-item"><span>Til</span><span>O‘zbekcha</span></div>
          </div>
          <p className="detail-description">{book.description}</p>
          <div className="detail-actions">
            <button className="button-primary" onClick={() => onStart(book.id)}>
              <BookOpen size={16} />
              {user ? (progress?.status === 'reading' ? 'O‘qishni davom ettirish' : 'O‘qishni boshlash') : 'O‘qish uchun kirish'}
            </button>
            <button className="button-secondary" onClick={() => onFavorite(book.id)}>
              <Heart size={16} fill={favorites.includes(book.id) ? 'currentColor' : 'none'} />
              {favorites.includes(book.id) ? 'Sevimlilarda' : 'Sevimlilarga qo‘shish'}
            </button>
            <button className="button-secondary" onClick={() => onCart(book.id)}>
              <ShoppingCart size={16} />
              {readingList.includes(book.id) ? 'Ro‘yxatda' : 'O‘qish ro‘yxatiga'}
            </button>
          </div>
          {progress?.status === 'reading' && (
            <div className="detail-progress">
              O‘qish jarayoni · {progress.progress}%
              <div className="progress-line"><span style={{ width: `${progress.progress}%` }} /></div>
            </div>
          )}
        </div>
      </div>
      <div className="section" style={{ borderTop: '1px solid var(--line)', paddingTop: 34, paddingBottom: 56 }}>
        <SectionHeading kicker="Mutolaa uchun" title="Asar haqida" />
        <p className="detail-description" style={{ maxWidth: 760 }}>
          {book.description} Ushbu sahifadagi parcha tanishuv uchun berilgan qisqa namuna bo‘lib, to‘liq nashr matni emas.
        </p>
      </div>
      <AdBanner placement="book_detail" />
      <BookReviews bookId={book.id} user={user} csrfToken={csrfToken} onSignIn={onSignIn} />
    </div>
  )
}
