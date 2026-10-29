import React, { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { SectionHeading } from './BookCard.jsx'
import { apiRequest } from './common/api.js'
import { formatDate } from './common/dateUtils.js'

export function BookReviews({ bookId, user, csrfToken, onSignIn }) {
  const [data, setData] = useState({ average: 0, count: 0, reviews: [], myReview: null })
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    apiRequest(`/api/books/${encodeURIComponent(bookId)}/reviews`)
      .then((result) => {
        if (cancelled) return
        setData(result)
        if (result.myReview) {
          setRating(result.myReview.rating)
          setComment(result.myReview.comment)
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message)
      })
    return () => { cancelled = true }
  }, [bookId, user?.id, reload])

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/api/books/${encodeURIComponent(bookId)}/reviews`, {
        method: 'POST',
        body: { rating, comment },
        csrfToken,
      })
      setReload((value) => value + 1)
      setError('')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="reviews-section">
      <SectionHeading kicker="Kitobxonlar fikri" title="Baho va izohlar" />
      <div className="reviews-summary">
        <span className="rating"><Star size={17} fill="currentColor" strokeWidth={0} />{data.count ? data.average.toFixed(1) : '—'}</span>
        <span>{data.count ? `${data.count} ta izoh` : 'Hozircha baho berilmagan'}</span>
      </div>
      {user ? (
        <form className="review-form" onSubmit={submit}>
          <label className="review-label">Yulduzli baho</label>
          <div className="star-picker" role="radiogroup" aria-label="Kitobga baho berish">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} yulduz`}
                onClick={() => setRating(value)}
                className={value <= rating ? 'selected' : ''}
              >
                <Star size={25} fill={value <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <label className="review-label" htmlFor={`review-${bookId}`}>Izohingiz</label>
          <textarea
            id={`review-${bookId}`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={2000}
            placeholder="Kitob haqidagi fikringizni yozing…"
            required
          />
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button-primary" type="submit" disabled={saving || !comment.trim()}>
            {saving ? 'Saqlanmoqda…' : data.myReview ? 'Izohni yangilash' : 'Bahoni yuborish'}
          </button>
        </form>
      ) : (
        <div className="review-login-prompt">
          <span>Baho berish va izoh qoldirish uchun akkauntga kiring.</span>
          <button className="button-secondary" onClick={onSignIn}>Kirish</button>
        </div>
      )}
      {data.reviews.length ? (
        <div className="review-list">
          {data.reviews.map((review, index) => (
            <article className="review-item" key={`${review.username}-${review.createdAt}-${index}`}>
              <div className="review-heading">
                <strong>{review.username}</strong>
                <span>{formatDate(review.updatedAt || review.createdAt)}</span>
              </div>
              <div className="review-stars" aria-label={`${review.rating} yulduz`}>
                {[1, 2, 3, 4, 5].map((value) => <Star key={value} size={14} fill={value <= review.rating ? 'currentColor' : 'none'} />)}
              </div>
              <p>{review.comment}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="reviews-empty">Birinchi bo‘lib fikr bildiring.</div>
      )}
    </section>
  )
}
