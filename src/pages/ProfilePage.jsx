import React from 'react'
import { BookOpen, Check, Heart, LogOut, ShoppingCart } from 'lucide-react'
import { BookCard, BookCover, SectionHeading } from '../components/BookCard.jsx'
import { Link } from '../components/common/Link.jsx'

export function ProfilePage({ books, user, reading, favorites, readingList, onStart, onFavorite, onCart, onComplete, onOpen, onLogout }) {
  const current = books.filter((book) => reading[book.id]?.status === 'reading')
  const completed = books.filter((book) => reading[book.id]?.status === 'completed')
  const saved = books.filter((book) => favorites.includes(book.id))
  const readPages = completed.reduce((total, book) => total + book.pages, 0)
    + current.reduce((total, book) => total + Math.round(book.pages * reading[book.id].progress / 100), 0)
  const initials = user.username.slice(0, 2).toLocaleUpperCase()

  return (
    <div className="page-content">
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-user-copy">
          <div className="section-kicker">Shaxsiy kutubxonangiz</div>
          <h1>{user.username}</h1>
          <p>{user.email}</p>
        </div>
        <div className="profile-actions">
          <Link href="/cart" className="button-secondary">
            <ShoppingCart size={15} /> O‘qish ro‘yxati · {readingList.length}
          </Link>
          <button className="button-secondary" onClick={onLogout}>
            <LogOut size={15} /> Chiqish
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card"><span>Mutolaa sahifalari</span><strong>{readPages.toLocaleString('uz')}</strong></div>
        <div className="stat-card"><span>O‘qilayotgan</span><strong>{current.length}</strong></div>
        <div className="stat-card"><span>Tugallangan</span><strong>{completed.length}</strong></div>
      </div>

      <section className="profile-section">
        <h2>O‘qilayotgan kitoblar</h2>
        {current.length ? (
          current.map((book) => (
            <ReadingRow key={book.id} book={book} progress={reading[book.id]} onStart={onStart} onComplete={onComplete} />
          ))
        ) : (
          <div className="empty-state">
            <BookOpen size={27} />
            <h2>Hozircha mutolaa boshlanmagan</h2>
            <p>Bir kitob tanlang. Keyin uni davom ettirish shu yerdan oson.</p>
            <Link href="/search" className="button-primary">Kitob topish</Link>
          </div>
        )}
      </section>

      <section className="profile-section">
        <h2>Tugallangan kitoblar</h2>
        {completed.length ? (
          completed.map((book) => (
            <ReadingRow key={book.id} book={book} progress={reading[book.id]} onStart={onStart} completed />
          ))
        ) : (
          <div className="empty-state">
            <Check size={27} />
            <h2>Hali tugallangan kitob yo‘q</h2>
            <p>Mutolaani yakunlaganingizda kitob shu yerda paydo bo‘ladi.</p>
          </div>
        )}
      </section>

      <section className="profile-section" style={{ paddingBottom: 60 }}>
        <SectionHeading kicker="Qayta ochish uchun" title="Sevimli kitoblar" link="Barchasi" href="/favorites" />
        {saved.length ? (
          <div className="book-grid">
            {saved.slice(0, 3).map((book) => (
              <BookCard
                key={book.id}
                book={book}
                favorite
                inReadingList={readingList.includes(book.id)}
                canRead
                onFavorite={onFavorite}
                onCart={onCart}
                onStart={onStart}
                onOpen={onOpen}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Heart size={27} />
            <h2>Hali sevimlilar saqlanmadi</h2>
            <p>Yoqtirgan kitoblaringizni yurak belgisi bilan saqlang.</p>
            <Link href="/search" className="button-secondary">Katalogni ko‘rish</Link>
          </div>
        )}
      </section>
    </div>
  )
}

export function ReadingRow({ book, progress, onStart, onComplete, completed }) {
  return (
    <div className="reading-row">
      <Link href={`/books/${book.id}`}><BookCover book={book} /></Link>
      <div>
        <Link href={`/books/${book.id}`}><h3>{book.title}</h3></Link>
        <p>{completed ? 'Tugallangan asar' : `${progress.progress}% · ${book.author}`}</p>
        {!completed && (
          <div className="progress-line"><span style={{ width: `${progress.progress}%` }} /></div>
        )}
      </div>
      {completed ? (
        <span className="completed-mark"><Check size={15} />Tugallandi</span>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="button-secondary" onClick={() => onComplete(book.id)}>Tugatdim</button>
          <button className="button-primary" onClick={() => onStart(book.id)}>Davom etish</button>
        </div>
      )}
    </div>
  )
}
