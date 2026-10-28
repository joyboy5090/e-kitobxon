import React from 'react'
import { ArrowRight, ArrowUpRight, Heart, ShoppingCart, Star } from 'lucide-react'
import { Link } from './common/Link.jsx'

export function BookCover({ book, className = '' }) {
  return (
    <div
      className={`book-cover ${className}`}
      style={{ background: `linear-gradient(145deg, ${book.color}, ${book.color} 60%, ${book.accent})` }}
    >
      <span className="cover-author">{book.author}</span>
      <strong className="cover-title">{book.title}</strong>
      <span className="cover-seal">Kitobxon nashri</span>
    </div>
  )
}

export function BookCard({ book, favorite, inReadingList, canRead, onFavorite, onCart, onStart, onOpen }) {
  return (
    <article className="book-card">
      <Link href={`/books/${book.id}`} className="cover-wrap" aria-label={`${book.title} tafsilotlari`}>
        <BookCover book={book} />
      </Link>
      <div className="card-content">
        <span className="genre-label">{book.genre}</span>
        <Link href={`/books/${book.id}`}><h3>{book.title}</h3></Link>
        <span className="author">{book.author}</span>
        <p className="description">{book.description}</p>
        <div className="card-bottom">
          <span className="rating"><Star size={13} fill="currentColor" strokeWidth={0} />{book.rating}</span>
          <div className="card-actions">
            <button className="start-link" onClick={() => canRead ? onStart(book.id) : onOpen(book.id)}>
              {canRead ? 'O‘qish' : 'Batafsil'} <ArrowRight size={13} />
            </button>
            <button
              className={`favorite-button ${favorite ? 'is-favorite' : ''}`}
              onClick={() => onFavorite(book.id)}
              aria-label={favorite ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo‘shish'}
            >
              <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
            </button>
            <button
              className={`favorite-button cart-button ${inReadingList ? 'is-favorite' : ''}`}
              onClick={() => onCart(book.id)}
              aria-label={inReadingList ? 'O‘qish ro‘yxatidan olib tashlash' : 'O‘qish ro‘yxatiga qo‘shish'}
              title="O‘qish ro‘yxati"
            >
              <ShoppingCart size={16} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export function SectionHeading({ kicker, title, link, href }) {
  return (
    <div className="section-heading">
      <div>
        <div className="section-kicker">{kicker}</div>
        <h2>{title}</h2>
      </div>
      {link && (
        <Link href={href} className="text-link">
          {link}<ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  )
}
