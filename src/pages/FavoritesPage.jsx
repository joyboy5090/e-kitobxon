import React from 'react'
import { ArrowRight, Heart, ShoppingCart } from 'lucide-react'
import { BookCard } from '../components/BookCard.jsx'
import { Link } from '../components/common/Link.jsx'

export function FavoritesPage({ books, favorites, readingList, onFavorite, onCart, onStart, onOpen }) {
  const selected = books.filter((book) => favorites.includes(book.id))

  return (
    <div className="page-content">
      <div className="page-title">
        <div className="section-kicker">Qayta uchrashish uchun</div>
        <h1>Sevimlilar</h1>
        <p>Ko‘nglingizga yaqin kitoblar shu yerda saqlanadi.</p>
      </div>
      {selected.length ? (
        <div className="book-grid">
          {selected.map((book) => (
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
          <Heart size={30} />
          <h2>Sevimli kitoblaringiz hali yo‘q</h2>
          <p>Kitob kartasidagi yurak belgisini bosib, yoqtirganlaringizni shu yerga jamlang.</p>
          <Link href="/search" className="button-primary">
            Kitoblarni kashf etish <ArrowRight size={15} />
          </Link>
        </div>
      )}
      <div style={{ height: 100 }} />
    </div>
  )
}

export function ReadingListPage({ books, readingList, favorites, onFavorite, onCart, onStart, onOpen }) {
  const selected = books.filter((book) => readingList.includes(book.id))

  return (
    <div className="page-content">
      <div className="page-title">
        <div className="section-kicker">Keyin mutolaa qilish uchun</div>
        <h1>O‘qish ro‘yxati</h1>
        <p>Keyinroq o‘qimoqchi bo‘lgan kitoblaringiz shu yerda saqlanadi.</p>
      </div>
      {selected.length ? (
        <div className="book-grid">
          {selected.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              favorite={favorites.includes(book.id)}
              inReadingList
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
          <ShoppingCart size={30} />
          <h2>O‘qish ro‘yxati hozircha bo‘sh</h2>
          <p>Kitob kartasidagi savatcha belgisini bosib, keyin o‘qimoqchi bo‘lganlaringizni saqlang.</p>
          <Link href="/search" className="button-primary">
            Kitoblarni kashf etish <ArrowRight size={15} />
          </Link>
        </div>
      )}
      <div style={{ height: 100 }} />
    </div>
  )
}
