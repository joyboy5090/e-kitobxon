import React, { useEffect, useState } from 'react'
import {
  ArrowLeft, Bookmark, Check, ChevronLeft, ChevronRight, List,
  Moon, SlidersHorizontal, Sparkles, Sun, Type, BookOpen
} from 'lucide-react'
import { Link } from '../components/common/Link.jsx'

export function ReaderPage({ book, progress, bookmark, preferences, onPreferences, onChapter, onBookmark, onComplete }) {
  const [showSettings, setShowSettings] = useState(false)
  const [chapterIndex, setChapterIndex] = useState(progress?.chapter ?? (bookmark ?? 0))

  useEffect(() => {
    setChapterIndex(progress?.chapter ?? (bookmark ?? 0))
  }, [book?.id])

  if (!book) {
    return (
      <div className="empty-state">
        <BookOpen size={30} />
        <h2>Kitob topilmadi</h2>
        <Link href="/search" className="button-primary">Kitoblarga qaytish</Link>
      </div>
    )
  }

  const chapter = book.chapters[chapterIndex] || book.chapters[0]
  const isBookmarked = bookmark === chapterIndex

  const goToChapter = (next) => {
    const bounded = Math.max(0, Math.min(book.chapters.length - 1, next))
    setChapterIndex(bounded)
    onChapter(book.id, bounded, book.chapters.length)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setPreference = (value) => onPreferences((current) => ({ ...current, ...value }))

  return (
    <div className={`reader-page ${preferences.dark ? 'dark' : ''}`}>
      <div className="reader-toolbar">
        <Link href={`/books/${book.id}`} className="reader-back">
          <ArrowLeft size={18} /> Kitobga qaytish
        </Link>
        <div className="reader-book-name">
          {book.title}
          <small>{book.author}</small>
        </div>
        <div className="reader-actions">
          <button className="reader-tool" onClick={() => setShowSettings((value) => !value)} aria-label="O‘qish sozlamalari">
            <SlidersHorizontal size={17} /><span>Ko‘rinish</span>
          </button>
          <button className="reader-tool" onClick={() => setPreference({ dark: !preferences.dark })} aria-label={preferences.dark ? 'Yorug‘ rejim' : 'Tungi rejim'}>
            {preferences.dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="reader-tool" onClick={() => onBookmark(book.id, chapterIndex)} aria-label={isBookmarked ? 'Xatcho‘pni olib tashlash' : 'Xatcho‘p qo‘yish'}>
            <Bookmark size={17} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="reader-progress-top">
          <span style={{ width: `${progress?.status === 'completed' ? 100 : progress?.progress || 4}%` }} />
        </div>
        {showSettings && (
          <div className="reader-controls-popover">
            <div className="control-row">
              <span><Type size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Matn o‘lchami</span>
              <div className="control-toggle">
                {[17, 19, 22].map((size) => (
                  <button key={size} className={preferences.fontSize === size ? 'selected' : ''} onClick={() => setPreference({ fontSize: size })}>
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="control-row">
              <span>O‘qish kengligi</span>
              <div className="control-toggle">
                {[['wide', 'Keng'], ['narrow', 'Ixcham']].map(([value, label]) => (
                  <button key={value} className={preferences.width === value ? 'selected' : ''} onClick={() => setPreference({ width: value })}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="reader-layout">
        <aside className="toc-panel">
          <h3><List size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />Mundarija</h3>
          {book.chapters.map((item, index) => (
            <button key={item.title} className={`toc-item ${index === chapterIndex ? 'active' : ''}`} onClick={() => goToChapter(index)}>
              {String(index + 1).padStart(2, '0')} &nbsp; {item.title}
            </button>
          ))}
        </aside>
        <article className={`reader-content ${preferences.width === 'narrow' ? 'narrow' : ''}`}>
          <header className="reader-heading">
            <div className="chapter-label">{book.title}</div>
            <h1>{chapter.title}</h1>
            <p>{String(chapterIndex + 1).padStart(2, '0')} / {String(book.chapters.length).padStart(2, '0')} · qisqa namuna</p>
          </header>
          <div className="demo-banner">
            <Sparkles size={14} />
            <span>Mutolaa namunasi — bu asardan tanlangan qisqa parcha. To‘liq matn nashri emas.</span>
          </div>
          <div className="reader-text" style={{ fontSize: `${preferences.fontSize}px` }}>
            {chapter.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
          <div className="reader-bottom">
            <button className="button-secondary" disabled={chapterIndex === 0} onClick={() => goToChapter(chapterIndex - 1)}>
              <ChevronLeft size={15} />Avvalgi bob
            </button>
            <div className="chapter-progress">
              Mutolaa jarayoni<br />
              <strong>{progress?.status === 'completed' ? 100 : progress?.progress || 4}%</strong>
            </div>
            {chapterIndex === book.chapters.length - 1 ? (
              <button
                className="button-primary"
                onClick={() => {
                  onComplete(book.id)
                  window.history.pushState({}, '', `/books/${book.id}`)
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }}
              >
                <Check size={15} />Tugatdim
              </button>
            ) : (
              <button className="button-primary" onClick={() => goToChapter(chapterIndex + 1)}>
                Keyingi bob<ChevronRight size={15} />
              </button>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
