import React, { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, Clock, Eye, Feather, MessageSquare, Newspaper, Search, Sparkles } from 'lucide-react'
import { Link } from '../components/common/Link.jsx'
import { apiRequest } from '../components/common/api.js'
import '../blog.css'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function BlogPage({ onNavigate }) {
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Adabiy Blog va Taqrizlar — e-kitobxon.uz'
  }, [])

  useEffect(() => {
    let ignore = false
    setLoading(true)

    const params = new URLSearchParams()
    if (selectedCategory !== 'all') params.set('category', selectedCategory)
    if (searchQuery.trim()) params.set('q', searchQuery.trim())

    apiRequest(`/api/blog?${params.toString()}`)
      .then((data) => {
        if (!ignore) {
          setPosts(data.posts || [])
          setCategories(data.categories || [])
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Maqolalarni yuklab bo‘lmadi')
          setLoading(false)
        }
      })

    return () => { ignore = true }
  }, [selectedCategory, searchQuery])

  const featured = posts.length > 0 ? posts[0] : null
  const regularPosts = posts.length > 1 ? posts.slice(1) : []

  return (
    <div className="blog-page">
      <div className="blog-hero">
        <span className="blog-hero__badge"><Feather size={14} /> Adabiyot gulshani</span>
        <h1>Adabiy Blog, Taqrizlar va Mutolaa Sirlari</h1>
        <p>
          O‘zbek va jahon adabiyotining durdona asarlari tahlili, yozuvchilar hayoti,
          mutolaa madaniyati va kitobxonlikka doir sara maqolalar.
        </p>
      </div>

      <div className="blog-filters-bar">
        <div className="blog-categories" role="tablist" aria-label="Maqola ruknlari">
          <button
            type="button"
            className={`blog-cat-pill ${selectedCategory === 'all' ? 'is-active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            Barchasi
          </button>
          {categories.map((c) => (
            <button
              key={c.category}
              type="button"
              className={`blog-cat-pill ${selectedCategory === c.category ? 'is-active' : ''}`}
              onClick={() => setSelectedCategory(c.category)}
            >
              {c.category} <span style={{ opacity: 0.7, fontSize: 11 }}>({c.count})</span>
            </button>
          ))}
        </div>

        <div className="blog-search-box">
          <Search size={16} className="blog-search-icon" />
          <input
            type="search"
            placeholder="Maqola yoki muallifni qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Maqolalarni qidirish"
          />
        </div>
      </div>

      {loading ? (
        <div className="catalog-loading">
          <BookOpen size={24} className="spin-slow" />
          <p>Adabiy maqolalar yuklanmoqda...</p>
        </div>
      ) : error ? (
        <div className="empty-state" role="alert">
          <p>{error}</p>
          <button type="button" className="button-primary" onClick={() => setSelectedCategory('all')}>Qayta urinish</button>
        </div>
      ) : posts.length === 0 ? (
        <div className="blog-empty">
          <Newspaper size={36} style={{ color: 'var(--wine, #8f2d2a)', opacity: 0.6 }} />
          <h3>Hozircha maqolalar topilmadi</h3>
          <p>Qidiruv so‘rovingizni o‘zgartirib yoki boshqa ruknni tanlab ko‘ring.</p>
        </div>
      ) : (
        <>
          {featured && !searchQuery && selectedCategory === 'all' && (
            <Link href={`/blog/${featured.slug}`} className="blog-featured-card">
              <div className="blog-featured-card__left">
                <div className="blog-featured-card__meta">
                  <span className="blog-tag">{featured.category}</span>
                  <span>•</span>
                  <span>{formatDate(featured.created_at)}</span>
                  <span>•</span>
                  <span><Clock size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} /> {featured.reading_time} daqiqa</span>
                </div>
                <h2>{featured.title}</h2>
                <p>{featured.excerpt}</p>
                <div className="blog-featured-card__footer">
                  <span className="blog-read-more-btn">
                    Maqolani o‘qish <ArrowRight size={15} />
                  </span>
                  <span><Eye size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {featured.views_count} marta o‘qildi</span>
                </div>
              </div>
              <div className="blog-featured-card__right">
                <div style={{ textAlign: 'center', maxWidth: 300 }}>
                  <Sparkles size={28} style={{ color: '#d0ae7e', marginBottom: 12 }} />
                  <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.8, color: '#d0ae7e' }}>Hafta tavsiyasi</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginTop: 8, lineHeight: 1.4 }}>
                    {featured.title}
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div className="blog-grid">
            {(searchQuery || selectedCategory !== 'all' ? posts : regularPosts).map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="blog-card">
                <div className="blog-card__header">
                  <span className="blog-tag">{post.category}</span>
                  <span><Clock size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} /> {post.reading_time} daq</span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <div className="blog-card__footer">
                  <span>{formatDate(post.created_at)}</span>
                  <span><Eye size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {post.views_count}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
