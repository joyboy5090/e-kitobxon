import React, { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { BookCard } from '../components/BookCard.jsx'

export function SearchPage({ books, genres, query, genre, querySort, favorites, readingList, onFavorite, onCart, onStart, onNavigate, canRead }) {
  const [text, setText] = useState(query)
  const [activeGenre, setActiveGenre] = useState(genre)
  const [sort, setSort] = useState(querySort || 'recommended')

  useEffect(() => {
    setText(query)
    setActiveGenre(genre)
    setSort(querySort || 'recommended')
  }, [query, genre, querySort])

  const normalized = text.trim().toLocaleLowerCase()
  let results = books.filter((book) => {
    const corpus = `${book.title} ${book.author} ${book.genre} ${book.group} ${book.description}`.toLocaleLowerCase()
    const textMatch = !normalized || corpus.includes(normalized)
    if (!activeGenre) return textMatch
    const genreMatch = (book.categories || []).some((category) => category.toLocaleLowerCase() === activeGenre.toLocaleLowerCase())
    return textMatch && genreMatch
  })

  if (sort === 'rating') results = [...results].sort((a, b) => (Number(b.ratingValue) || (Number(b.rating) || 0)) - (Number(a.ratingValue) || (Number(a.rating) || 0)))
  if (sort === 'popular') results = [...results].sort((a, b) => (Number(b.reviewsCount) || 0) - (Number(a.reviewsCount) || 0) || (Number(b.ratingValue) || 0) - (Number(a.ratingValue) || 0))
  if (sort === 'title') results = [...results].sort((a, b) => a.title.localeCompare(b.title, 'uz'))

  const submit = (event) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (text.trim()) params.set('q', text.trim())
    if (activeGenre) params.set('genre', activeGenre)
    onNavigate(`/search?${params.toString()}`)
  }

  return (
    <div className="page-content">
      <div className="page-title">
        <div className="section-kicker">Siz uchun tanlangan</div>
        <h1>{activeGenre || (query ? 'Qidiruv natijalari' : 'Kitoblar olami')}</h1>
        <p>Yuragingizga yaqin hikoyani shu yerdan toping.</p>
      </div>
      <div className="search-tools">
        <form className="search-form" onSubmit={submit}>
          <Search size={18} color="#9b8c7e" />
          <input aria-label="Qidiruv" value={text} onChange={(event) => setText(event.target.value)} placeholder="Kitob, muallif yoki janrni qidiring..." />
          {text && (
            <button className="icon-button" type="button" aria-label="Qidiruvni tozalash" onClick={() => setText('')}>
              <X size={15} />
            </button>
          )}
          <button className="button-primary" type="submit">Qidirish</button>
        </form>
        <select className="select-control" value={activeGenre} onChange={(event) => setActiveGenre(event.target.value)} aria-label="Janr bo‘yicha tanlash">
          <option value="">Barcha janrlar</option>
          {genres.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="select-control" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Saralash">
          <option value="recommended">Tavsiya etilgan</option>
          <option value="popular">Mashhurligi bo‘yicha</option>
          <option value="rating">Yuqori baho</option>
          <option value="title">Alifbo bo‘yicha</option>
        </select>
      </div>
      <p className="result-note">{results.length} ta kitob topildi{activeGenre ? ` · ${activeGenre}` : ''}</p>
      {results.length ? (
        <div className="book-grid">
          {results.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              favorite={favorites.includes(book.id)}
              inReadingList={readingList.includes(book.id)}
              canRead={canRead}
              onFavorite={onFavorite}
              onCart={onCart}
              onStart={onStart}
              onOpen={(id) => onNavigate(`/books/${id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={30} />
          <h2>Bu safar kitob topilmadi</h2>
          <p>Boshqa so‘z yoki janr bilan yana bir bor qidirib ko‘ring.</p>
          <button className="button-secondary" onClick={() => { setText(''); setActiveGenre('') }}>
            Barcha kitoblarga qaytish
          </button>
        </div>
      )}
      <div style={{ height: 70 }} />
    </div>
  )
}
