import React, { useState } from 'react'
import { Atom, Baby, BookOpen, Globe2, Heart, Landmark, Search, Smile } from 'lucide-react'
import { BookCard, SectionHeading } from '../components/BookCard.jsx'
import { Link } from '../components/common/Link.jsx'
import AdBanner from '../AdBanner.jsx'

export function HomePage({ books, genres, favorites, readingList, onFavorite, onCart, onStart, onOpen, onNavigate, canRead }) {
  const [search, setSearch] = useState('')
  const submit = (event) => {
    event.preventDefault()
    onNavigate(`/search?q=${encodeURIComponent(search.trim())}`)
  }
  const categoryIcon = [BookOpen, Heart, Smile, Search, Atom, Globe2, Landmark, Baby]

  const popularBooks = [...books]
    .sort((a, b) => (Number(b.reviewsCount) || 0) - (Number(a.reviewsCount) || 0) || (Number(b.ratingValue) || 0) - (Number(a.ratingValue) || 0))
    .slice(0, 3)

  return (
    <div className="page-content">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Kitob bilan o‘tgan vaqt — o‘zingizga sovg‘a</div>
          <h1>Sevimli kitoblaringizni istalgan joyda o‘qing.</h1>
          <p>O‘zbek va jahon adabiyotining sara asarlarini bir joyda kashf eting.</p>
          <form className="search-form" onSubmit={submit}>
            <Search size={18} color="#9b8c7e" />
            <input
              aria-label="Kitob qidirish"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Kitob, muallif yoki janrni qidiring..."
            />
            <button className="button-primary" type="submit">Qidirish</button>
          </form>
        </div>
        <div className="hero-art" aria-label="Kitob muqovasi tasviri">
          <div className="hero-book">
            <small>Abdulla Qodiriy</small>
            <strong>O‘tkan<br />kunlar</strong>
            <span>ROMAN</span>
          </div>
          <div className="floating-note">«Mutolaa — qalbning sayri»</div>
        </div>
      </section>

      <section className="section">
        <SectionHeading kicker="O‘quvchilar tanlovi" title="Mashhur kitoblar" link="Barcha kitoblar" href="/search?sort=popular" />
        <div className="book-grid">
          {popularBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              favorite={favorites.includes(book.id)}
              inReadingList={readingList.includes(book.id)}
              canRead={canRead}
              onFavorite={onFavorite}
              onCart={onCart}
              onStart={onStart}
              onOpen={onOpen}
            />
          ))}
        </div>
      </section>

      <AdBanner placement="home_top" />

      <section className="section">
        <SectionHeading kicker="Kayfiyatingizga mosini toping" title="Janr bo‘yicha kashf eting" />
        <div className="genre-strip">
          {genres.map((genre, index) => {
            const Icon = categoryIcon[index] || BookOpen
            return (
              <Link key={genre} href={`/search?genre=${encodeURIComponent(genre)}`} className="genre-chip">
                <span>{genre}</span>
                <Icon size={17} strokeWidth={1.7} />
              </Link>
            )
          })}
        </div>
      </section>

      <section className="quote-band">
        <div className="quote-copy">
          <p>“Kitob o‘qigan inson ming umr yashaydi.”</p>
          <small>Har kuni o‘zingiz uchun bir sahifa</small>
        </div>
        <div className="quote-aside"><BookOpen size={32} strokeWidth={1.3} /></div>
      </section>

      <section className="section" style={{ paddingTop: 0, paddingBottom: 60 }}>
        <SectionHeading kicker="Yangi nigohlar, tanish tuyg‘ular" title="Yana bir sahifa oching" link="Hammasini ko‘rish" href="/search" />
        <div className="book-grid">
          {books.slice(3, 9).map((book) => (
            <BookCard
              key={book.id}
              book={book}
              favorite={favorites.includes(book.id)}
              inReadingList={readingList.includes(book.id)}
              canRead={canRead}
              onFavorite={onFavorite}
              onCart={onCart}
              onStart={onStart}
              onOpen={onOpen}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
