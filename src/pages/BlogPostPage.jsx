import React, { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, Check, ChevronRight, Clock, Copy, Eye, Feather, MessageCircle, Share2 } from 'lucide-react'
import { Link } from '../components/common/Link.jsx'
import { apiRequest } from '../components/common/api.js'
import '../blog.css'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Oddiy markdown parser (sarlavhalar, iqtiboslar, ro'yxatlar va paragraflar uchun)
function renderMarkdownContent(content) {
  if (!content) return null

  const lines = content.split('\n')
  const elements = []
  let inBlockquote = false
  let blockquoteLines = []
  let inList = false
  let listItems = []

  const flushBlockquote = () => {
    if (blockquoteLines.length) {
      elements.push(
        <blockquote key={`bq-${elements.length}`}>
          {blockquoteLines.join(' ')}
        </blockquote>
      )
      blockquoteLines = []
      inBlockquote = false
    }
  }

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={`ul-${elements.length}`}>
          {listItems.map((item, idx) => <li key={idx}>{item}</li>)}
        </ul>
      )
      listItems = []
      inList = false
    }
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    if (trimmed.startsWith('>')) {
      flushList()
      inBlockquote = true
      blockquoteLines.push(trimmed.replace(/^>\s*/, '').replace(/^[*"]|[*"]$/g, ''))
      return
    } else if (inBlockquote) {
      flushBlockquote()
    }

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      flushBlockquote()
      inList = true
      listItems.push(trimmed.replace(/^[*\-]\s*/, ''))
      return
    } else if (inList) {
      flushList()
    }

    if (trimmed.startsWith('## ')) {
      elements.push(<h2 key={`h2-${index}`}>{trimmed.replace('## ', '')}</h2>)
    } else if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={`h3-${index}`}>{trimmed.replace('### ', '')}</h3>)
    } else if (trimmed === '') {
      // Bo'sh qator
    } else {
      elements.push(<p key={`p-${index}`}>{trimmed}</p>)
    }
  })

  flushBlockquote()
  flushList()

  return elements
}

export function BlogPostPage({ slug, onNavigate }) {
  const [post, setPost] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    apiRequest(`/api/blog/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!ignore) {
          setPost(data.post)
          setRelated(data.relatedPosts || [])
          setLoading(false)
          document.title = `${data.post.title} — Kitobxon Blog`
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Maqola topilmadi')
          setLoading(false)
        }
      })

    return () => { ignore = true }
  }, [slug])

  const copyUrl = () => {
    navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const shareTelegram = () => {
    if (!post) return
    const url = encodeURIComponent(window.location.href)
    const text = encodeURIComponent(`${post.title}\n\ne-kitobxon.uz da mutolaa qiling:`)
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="blog-post-page">
        <div className="catalog-loading">
          <BookOpen size={24} className="spin-slow" />
          <p>Maqola yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="blog-post-page">
        <div className="empty-state" role="alert">
          <h2>Maqola topilmadi</h2>
          <p>{error || 'Siz qidirgan maqola o‘chirilgan yoki manzili o‘zgargan bo‘lishi mumkin.'}</p>
          <Link href="/blog" className="button-primary">Barcha maqolalar</Link>
        </div>
      </div>
    )
  }

  return (
    <article className="blog-post-page">
      <nav className="blog-post-breadcrumb" aria-label="Non ushoqlari">
        <Link href="/">Bosh sahifa</Link>
        <ChevronRight size={13} />
        <Link href="/blog">Blog</Link>
        <ChevronRight size={13} />
        <span>{post.category}</span>
      </nav>

      <header className="blog-post-header">
        <span className="blog-tag">{post.category}</span>
        <h1>{post.title}</h1>
        {post.excerpt && <div className="blog-post-excerpt">{post.excerpt}</div>}

        <div className="blog-post-meta">
          <div className="blog-post-author">
            <div className="blog-post-author__avatar">
              <Feather size={16} />
            </div>
            <div>
              <strong>{post.author_name}</strong>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{formatDate(post.created_at)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span><Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {post.reading_time} daqiqa mutolaa</span>
            <span><Eye size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {post.views_count} marta o‘qildi</span>
          </div>

          <div className="blog-post-share">
            <button type="button" className="blog-share-btn" onClick={shareTelegram} title="Telegram orqali ulashish">
              <Share2 size={13} /> Telegram
            </button>
            <button type="button" className="blog-share-btn" onClick={copyUrl} title="Havolani nusxalash">
              {copied ? <Check size={13} color="#2e7d32" /> : <Copy size={13} />}
              {copied ? 'Nusxalandi!' : 'Havola'}
            </button>
          </div>
        </div>
      </header>

      <div className="blog-post-body">
        {renderMarkdownContent(post.content)}
      </div>

      <div className="blog-cta-box">
        <div>
          <h3>Kutubxonamizdagi durdona asarlarni o‘qiganmisiz?</h3>
          <p>e-kitobxon.uz da minglab sahifali asl o‘zbek va jahon adabiyoti mutlaqo bepul.</p>
        </div>
        <Link href="/search" className="button-primary">
          <BookOpen size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Kitoblarni kashf etish
        </Link>
      </div>

      {related.length > 0 && (
        <section className="blog-related-section">
          <h2>Tavsiya etiladigan boshqa maqolalar</h2>
          <div className="blog-grid">
            {related.map((item) => (
              <Link key={item.id} href={`/blog/${item.slug}`} className="blog-card">
                <div className="blog-card__header">
                  <span className="blog-tag">{item.category}</span>
                  <span><Clock size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} /> {item.reading_time} daq</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.excerpt}</p>
                <div className="blog-card__footer">
                  <span>{formatDate(item.created_at)}</span>
                  <span><Eye size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {item.views_count}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <Link href="/blog" className="button-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} /> Barcha maqolalarga qaytish
        </Link>
      </div>
    </article>
  )
}
