import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowLeftToLine, ArrowRight, ArrowRightToLine, Bookmark, BookOpen,
  Check, CircleAlert, FileText, RotateCw
} from 'lucide-react'
import './admin-reading.css'
import PdfPageCanvas from './PdfPageCanvas.jsx'

function safePageCount(value) {
  const count = Number(value)
  return Number.isInteger(count) && count > 0 ? count : null
}

function readStoredMode() {
  try {
    return localStorage.getItem('kitobxon-reader-mode') === 'original' ? 'original' : 'text'
  } catch {
    return 'text'
  }
}

function PdfBookReader({
  book,
  startPage = 0,
  bookmarkedPage = null,
  loadPage,
  recordReadPage,
  onProgress,
  onBookmark,
  onComplete,
  onExit
}) {
  const startingPage = Math.max(0, Number.isFinite(Number(startPage)) ? Math.floor(Number(startPage)) : 0)
  const [pageIndex, setPageIndex] = useState(startingPage)
  const [pageData, setPageData] = useState(null)
  const [pageCount, setPageCount] = useState(safePageCount(book?.pageCount ?? book?.pages))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pageEntry, setPageEntry] = useState(String(startingPage + 1))
  const [viewMode, setViewMode] = useState(readStoredMode)

  const loadPageRef = useRef(loadPage)
  const recordReadPageRef = useRef(recordReadPage)
  const onProgressRef = useRef(onProgress)
  const onBookmarkRef = useRef(onBookmark)
  const loadedReadRef = useRef('')
  const requestIdRef = useRef(0)
  loadPageRef.current = loadPage
  recordReadPageRef.current = recordReadPage
  onProgressRef.current = onProgress
  onBookmarkRef.current = onBookmark

  const changeViewMode = (mode) => {
    setViewMode(mode)
    try { localStorage.setItem('kitobxon-reader-mode', mode) } catch { /* ixtiyoriy */ }
  }

  useEffect(() => {
    setPageIndex(startingPage)
    setPageEntry(String(startingPage + 1))
    setPageData(null)
    setPageCount(safePageCount(book?.pageCount ?? book?.pages))
    loadedReadRef.current = ''
  }, [book?.id, startingPage])

  useEffect(() => {
    if (!book || book.hasPdf === false) {
      setPageData(null)
      setLoading(false)
      setError(book ? 'Bu kitob uchun PDF matni mavjud emas.' : 'Kitob topilmadi.')
      return undefined
    }

    const requestId = ++requestIdRef.current
    let active = true
    setLoading(true)
    setError('')
    Promise.resolve()
      .then(() => loadPageRef.current(pageIndex))
      .then((result) => {
        if (!active || requestId !== requestIdRef.current) return
        if (!result || typeof result !== 'object') {
          throw new Error('Sahifa matnini yuklab bo‘lmadi.')
        }
        const count = safePageCount(result.pageCount) || pageCount
        const content = result.content == null ? '' : String(result.content)
        setPageData({ ...result, content })
        if (count) setPageCount(count)
        setLoading(false)
        const readKey = `${book.id}:${pageIndex}`
        if (loadedReadRef.current !== readKey) {
          loadedReadRef.current = readKey
          try {
            Promise.resolve(recordReadPageRef.current?.(pageIndex)).catch(() => {})
          } catch {
            // Reading progress should not interrupt the text being read.
          }
          try {
            onProgressRef.current?.(pageIndex, count || pageCount || pageIndex + 1)
          } catch {
            // Progress reporting is independent from page rendering.
          }
        }
      })
      .catch((loadError) => {
        if (!active || requestId !== requestIdRef.current) return
        setPageData(null)
        setLoading(false)
        setError(loadError?.message || 'Sahifani yuklashda xatolik yuz berdi.')
      })

    return () => {
      active = false
    }
  }, [book?.id, book?.hasPdf, pageIndex])

  useEffect(() => {
    setPageEntry(String(pageIndex + 1))
  }, [pageIndex])

  const lastPage = pageCount ? pageIndex >= pageCount - 1 : false
  const progressPercent = pageCount ? Math.min(100, ((pageIndex + 1) / pageCount) * 100) : 0
  const paragraphs = pageData?.content ? pageData.content.split(/\n{2,}/) : []

  const goToPage = (target) => {
    if (!Number.isInteger(target) || target < 0 || (pageCount && target >= pageCount)) return
    setPageIndex(target)
  }

  const submitPage = (event) => {
    event.preventDefault()
    const entered = Number(pageEntry)
    if (!Number.isInteger(entered) || entered < 1 || (pageCount && entered > pageCount)) {
      setPageEntry(String(pageIndex + 1))
      return
    }
    goToPage(entered - 1)
  }

  const retry = () => {
    setPageData(null)
    setError('')
    const currentId = requestIdRef.current
    requestIdRef.current = currentId + 1
    setPageIndex((current) => current)
    setLoading(true)
    Promise.resolve()
      .then(() => loadPageRef.current(pageIndex))
      .then((result) => {
        if (requestIdRef.current !== currentId + 1) return
        if (!result || typeof result !== 'object') throw new Error('Sahifa matnini yuklab bo‘lmadi.')
        const count = safePageCount(result.pageCount) || pageCount
        const content = result.content == null ? '' : String(result.content)
        setPageData({ ...result, content })
        if (count) setPageCount(count)
        setLoading(false)
        const readKey = `${book?.id}:${pageIndex}`
        if (loadedReadRef.current !== readKey) {
          loadedReadRef.current = readKey
          try { Promise.resolve(recordReadPageRef.current?.(pageIndex)).catch(() => {}) } catch { /* keep reading */ }
          try { onProgressRef.current?.(pageIndex, count || pageCount || pageIndex + 1) } catch { /* keep reading */ }
        }
      })
      .catch((loadError) => {
        if (requestIdRef.current !== currentId + 1) return
        setLoading(false)
        setError(loadError?.message || 'Sahifani yuklashda xatolik yuz berdi.')
      })
  }

  const pageLabel = pageCount
    ? `Sahifa ${pageIndex + 1} / ${pageCount}`
    : `Sahifa ${pageIndex + 1}`
  const isBookmarked = bookmarkedPage === pageIndex

  return (
    <main className="kb-pdf-reader">
      <header className="kb-reader__toolbar">
        <button className="kb-button kb-button--quiet kb-reader__back" type="button" onClick={() => onExit?.()}>
          <ArrowLeft size={16} /> Kutubxonaga qaytish
        </button>
        <div className="kb-reader__toolbar-title">
          {book?.title || 'Kitob o‘quvchisi'}
          <small>{book?.author || 'Muallif ko‘rsatilmagan'}</small>
        </div>
        <div className="kb-reader__toolbar-actions">
          <div className="kb-reader__mode" role="group" aria-label="Ko‘rinish rejimi">
            <button
              className={`kb-button ${viewMode === 'text' ? 'is-on' : ''}`}
              type="button"
              aria-pressed={viewMode === 'text'}
              onClick={() => changeViewMode('text')}
              title="Matn ko‘rinishi"
            >
              <FileText size={15} /> <span>Matn</span>
            </button>
            <button
              className={`kb-button ${viewMode === 'original' ? 'is-on' : ''}`}
              type="button"
              aria-pressed={viewMode === 'original'}
              onClick={() => changeViewMode('original')}
              title="Asl PDF sahifasi"
            >
              <BookOpen size={15} /> <span>Asl PDF</span>
            </button>
          </div>
          <button
            className={`kb-button kb-reader__bookmark ${isBookmarked ? 'is-bookmarked' : ''}`}
            type="button"
            onClick={() => onBookmarkRef.current?.(pageIndex)}
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? 'Xatcho‘pni olib tashlash' : 'Sahifani xatcho‘pga saqlash'}
            title={isBookmarked ? 'Xatcho‘p saqlangan' : 'Xatcho‘p qo‘shish'}
          >
            <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
            <span>{isBookmarked ? 'Saqlangan' : 'Xatcho‘p'}</span>
          </button>
        </div>
        <div className="kb-reader__progress-track" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </header>

      <div className="kb-reader__body">
        <div className="kb-reader__intro">
          <div className="kb-reader__eyebrow"><BookOpen size={13} /> Sokin mutolaa</div>
          <h1>{book?.title || 'Kitob topilmadi'}</h1>
          <p>{pageLabel}{book?.language ? ` · ${book.language}` : ''}</p>
        </div>

        <article className="kb-reader__paper" aria-live="polite" aria-busy={loading}>
          {viewMode === 'original' && book ? (
            <PdfPageCanvas bookId={book.id} pageNumber={pageIndex + 1} />
          ) : loading ? (
            <div className="kb-reader__loading" role="status" aria-label="Sahifa matni yuklanmoqda">
              <span /><span /><span /><span /><span /><span /><span />
            </div>
          ) : error ? (
            <div className="kb-reader__message" role="alert">
              <CircleAlert size={24} />
              <h2>Sahifani ochib bo‘lmadi</h2>
              <p>{error}</p>
              {book && book.hasPdf !== false && (
                <button className="kb-button" type="button" onClick={retry}><RotateCw size={14} /> Qayta urinish</button>
              )}
            </div>
          ) : paragraphs.length ? (
            <>
              <div className="kb-reader__page-text">
                {paragraphs.map((paragraph, index) => <p key={`${pageIndex}-${index}`}>{paragraph}</p>)}
              </div>
              <div className="kb-reader__page-number">{pageIndex + 1}</div>
            </>
          ) : (
            <div className="kb-reader__message">
              <FileText size={25} />
              <h2>Bu sahifada matn yo‘q</h2>
              <p>Keyingi sahifaga o‘ting yoki kitobning boshqa sahifasini tanlang.</p>
            </div>
          )}
        </article>

        <nav className="kb-reader__controls" aria-label="Sahifalar bo‘ylab harakatlanish">
          <button
            className="kb-button"
            type="button"
            onClick={() => goToPage(0)}
            disabled={pageIndex === 0 || loading}
            aria-label="Birinchi sahifa"
            title="Birinchi sahifa"
          >
            <ArrowLeftToLine size={15} /> <span>Birinchi</span>
          </button>
          <button
            className="kb-button"
            type="button"
            onClick={() => goToPage(pageIndex - 1)}
            disabled={pageIndex === 0 || loading}
          >
            <ArrowLeft size={15} /> <span>Oldingi</span>
          </button>
          <form className="kb-reader__page-picker" onSubmit={submitPage}>
            <label htmlFor="kb-reader-page">Sahifa</label>
            <input
              id="kb-reader-page"
              className="kb-reader__page-input"
              type="number"
              min="1"
              max={pageCount || undefined}
              value={pageEntry}
              onChange={(event) => setPageEntry(event.target.value)}
              aria-label="Sahifa raqami"
            />
            <span>{pageCount ? `/ ${pageCount}` : 'ga o‘tish'}</span>
          </form>
          <button
            className="kb-button"
            type="button"
            onClick={() => lastPage ? onComplete?.() : goToPage(pageIndex + 1)}
            disabled={loading || (lastPage && !pageCount)}
          >
            <span>{lastPage ? 'Mutolaaga yakun yasash' : 'Keyingi'}</span>
            {lastPage ? <Check size={15} /> : <ArrowRight size={15} />}
          </button>
          <button
            className="kb-button"
            type="button"
            onClick={() => pageCount && goToPage(pageCount - 1)}
            disabled={!pageCount || pageIndex >= pageCount - 1 || loading}
            aria-label="Oxirgi sahifa"
            title="Oxirgi sahifa"
          >
            <span>Oxirgi</span><ArrowRightToLine size={15} />
          </button>
        </nav>
        <p className="kb-reader__hint">Shoshilmang — har bir sahifa o‘z hikoyasini aytadi.</p>
      </div>
    </main>
  )
}

export default PdfBookReader
