import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BookOpen, X } from 'lucide-react'
import { books, genres } from './catalog'
import '../index.css'

import AdminDashboard from './AdminDashboard.jsx'
import SupportPage from './SupportPage.jsx'
import LegalPage from './LegalPage.jsx'
import AboutPage from './AboutPage.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import PdfBookReader from './PdfBookReader.jsx'

import { Header, MobileNav } from './components/Header.jsx'
import { Footer } from './components/Footer.jsx'
import { AuthPage, AdminAccessDenied, AuthRequired } from './components/AuthPages.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { SearchPage } from './pages/SearchPage.jsx'
import { FavoritesPage, ReadingListPage } from './pages/FavoritesPage.jsx'
import { BookDetailPage } from './pages/BookDetailPage.jsx'
import { ReaderPage } from './pages/ReaderPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { BlogPage } from './pages/BlogPage.jsx'
import { BlogPostPage } from './pages/BlogPostPage.jsx'
import { apiRequest } from './components/common/api.js'
import { safeNextPath } from './components/common/Link.jsx'

const readStore = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [route, setRoute] = useState(() => window.location.pathname + window.location.search)
  const [user, setUser] = useState(null)
  const [csrfToken, setCsrfToken] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [booksLoading, setBooksLoading] = useState(true)
  const [library, setLibrary] = useState({})
  const [uploadedBooks, setUploadedBooks] = useState([])
  const [notice, setNotice] = useState('')
  const [preferences, setPreferences] = useState(() => readStore('kitobxon-preferences', { dark: false, fontSize: 19, width: 'wide' }))
  const [adminMonth, setAdminMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [adminData, setAdminData] = useState({ stats: null, books: [] })
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminReload, setAdminReload] = useState(0)

  const catalog = [...books, ...uploadedBooks]
  const catalogGenres = [...new Set([...genres, ...uploadedBooks.map((book) => book.genre).filter(Boolean)])]
  const findCatalogBook = (id) => catalog.find((book) => book.id === id)

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname + window.location.search)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Google Analytics & Yandex Metrika SPA sahifa o'zgarishini qayd etish
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: route,
        page_location: window.location.href,
        page_title: document.title,
      })
    }
    if (typeof window !== 'undefined' && typeof window.ym === 'function' && window.__YM_ID__) {
      window.ym(window.__YM_ID__, 'hit', route)
    }
  }, [route])

  useEffect(() => localStorage.setItem('kitobxon-preferences', JSON.stringify(preferences)), [preferences])

  useEffect(() => {
    let cancelled = false
    apiRequest('/api/auth/me')
      .then(async (data) => {
        if (cancelled) return
        setUser(data.user)
        setCsrfToken(data.csrfToken)
        if (data.user) {
          const result = await apiRequest('/api/library')
          if (!cancelled) setLibrary(result.library)
        }
      })
      .catch((error) => {
        if (!cancelled) setNotice(error.message)
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false)
      })
    apiRequest('/api/books')
      .then((data) => {
        if (!cancelled) setUploadedBooks(data.books || [])
      })
      .catch((error) => {
        if (!cancelled) setNotice(error.message)
      })
      .finally(() => {
        if (!cancelled) setBooksLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin' || route.split('?')[0] !== '/admin') return undefined
    let cancelled = false
    setAdminLoading(true)
    setAdminError('')
    Promise.all([
      apiRequest(`/api/admin/stats?month=${encodeURIComponent(adminMonth)}`),
      apiRequest('/api/admin/books'),
    ]).then(([stats, bookData]) => {
      if (cancelled) return
      setAdminData({ stats, books: bookData.books || [] })
    }).catch((error) => {
      if (!cancelled) setAdminError(error.message)
    }).finally(() => {
      if (!cancelled) setAdminLoading(false)
    })
    return () => { cancelled = true }
  }, [route, user?.role, adminMonth, adminReload])

  const navigate = (href) => {
    window.history.pushState({}, '', href)
    setRoute(window.location.pathname + window.location.search)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const signInFor = (next) => navigate(`/sign-in?next=${encodeURIComponent(next || route)}`)

  const saveBookState = async (id, patch) => {
    if (!user) {
      signInFor(`/books/${id}`)
      return false
    }
    try {
      const result = await apiRequest(`/api/library/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
        csrfToken,
      })
      setLibrary((current) => ({ ...current, [id]: result.state }))
      setNotice('')
      return true
    } catch (error) {
      setNotice(error.message)
      return false
    }
  }

  const toggleFavorite = (id) => saveBookState(id, { favorite: !library[id]?.favorite })
  const toggleReadingList = (id) => saveBookState(id, { inReadingList: !library[id]?.inReadingList })

  const startReading = async (id) => {
    if (!user) {
      signInFor(`/reader/${id}`)
      return
    }
    const current = library[id]
    const isCompleted = current?.status === 'completed'
    const saved = await saveBookState(id, {
      status: isCompleted ? 'completed' : 'reading',
      chapter: current?.chapter ?? 0,
      progress: isCompleted ? 100 : (current?.progress || 4),
    })
    if (saved) navigate(`/reader/${id}`)
  }

  const updateChapter = (id, chapter, count) => saveBookState(id, {
    status: library[id]?.status === 'completed' ? 'completed' : 'reading',
    chapter,
    progress: library[id]?.status === 'completed' ? 100 : Math.max(4, Math.round((chapter / count) * 86)),
  })

  const toggleBookmark = (id, chapter) => saveBookState(id, {
    bookmarkedChapter: library[id]?.bookmarkedChapter === chapter ? null : chapter,
  })

  const markCompleted = (id) => {
    const book = findCatalogBook(id)
    return saveBookState(id, {
      status: 'completed',
      chapter: Math.max(0, (book?.pageCount || book?.chapters?.length || 1) - 1),
      progress: 100,
    })
  }

  const updatePdfPage = (id, pageIndex, pageCount) => {
    const isCompleted = library[id]?.status === 'completed'
    return saveBookState(id, {
      status: isCompleted ? 'completed' : 'reading',
      chapter: pageIndex,
      progress: isCompleted ? 100 : Math.max(1, Math.min(100, Math.round(((pageIndex + 1) / pageCount) * 100))),
    })
  }

  const recordReadPage = (id, pageNumber) => apiRequest(`/api/books/${encodeURIComponent(id)}/read-events`, {
    method: 'POST',
    body: { pageNumber },
    csrfToken,
  })

  const refreshPublicBooks = () => {
    setAdminReload((value) => value + 1)
    apiRequest('/api/books').then((data) => setUploadedBooks(data.books || [])).catch(() => {})
  }

  const uploadBook = async (formData) => {
    setAdminLoading(true)
    setAdminError('')
    try {
      const response = await fetch('/api/admin/books', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'X-Kitobxon-Request': '1',
          'X-CSRF-Token': csrfToken,
        },
        body: formData,
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Kitob yuklanmadi.')
      setUploadedBooks((current) => [data.book, ...current])
      setAdminReload((value) => value + 1)
      return data.book
    } finally {
      setAdminLoading(false)
    }
  }

  const onAuthenticated = async (data, nextPath) => {
    setUser(data.user)
    setCsrfToken(data.csrfToken)
    setNotice('')
    try {
      const result = await apiRequest('/api/library')
      setLibrary(result.library)
    } catch (error) {
      setNotice(error.message)
    }
    navigate(safeNextPath(nextPath))
  }

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST', body: {}, csrfToken })
      setUser(null)
      setLibrary({})
      setCsrfToken('')
      setNotice('')
      navigate('/')
      const data = await apiRequest('/api/auth/me')
      setCsrfToken(data.csrfToken)
    } catch (error) {
      setNotice(error.message)
    }
  }

  const favorites = Object.entries(library).filter(([, state]) => state.favorite).map(([id]) => id)
  const readingList = Object.entries(library).filter(([, state]) => state.inReadingList).map(([id]) => id)
  const reading = Object.fromEntries(Object.entries(library)
    .filter(([, state]) => state.status === 'reading' || state.status === 'completed')
    .map(([id, state]) => [id, { status: state.status, chapter: state.chapter, progress: state.progress }]))
  const bookmarks = Object.fromEntries(Object.entries(library)
    .filter(([, state]) => state.bookmarkedChapter !== null && state.bookmarkedChapter !== undefined)
    .map(([id, state]) => [id, state.bookmarkedChapter]))

  const [path, queryString = ''] = route.split('?')
  const params = new URLSearchParams(queryString)

  let screen
  if (path === '/sign-in') {
    screen = <AuthPage mode="login" csrfToken={csrfToken} nextPath={params.get('next')} onAuthenticated={onAuthenticated} />
  } else if (path === '/sign-up') {
    screen = <AuthPage mode="register" csrfToken={csrfToken} nextPath={params.get('next')} onAuthenticated={onAuthenticated} />
  } else if (path === '/search') {
    screen = <SearchPage books={catalog} genres={catalogGenres} query={params.get('q') || ''} genre={params.get('genre') || ''} querySort={params.get('sort') || ''} onNavigate={navigate} favorites={favorites} readingList={readingList} onFavorite={toggleFavorite} onCart={toggleReadingList} onStart={startReading} canRead={Boolean(user)} />
  } else if (path === '/favorites') {
    screen = user
      ? <FavoritesPage books={catalog} favorites={favorites} onFavorite={toggleFavorite} onCart={toggleReadingList} readingList={readingList} onStart={startReading} onOpen={(id) => navigate(`/books/${id}`)} />
      : <AuthRequired onSignIn={() => signInFor('/favorites')} onSignUp={() => navigate('/sign-up?next=%2Ffavorites')} />
  } else if (path === '/cart') {
    screen = user
      ? <ReadingListPage books={catalog} readingList={readingList} favorites={favorites} onFavorite={toggleFavorite} onCart={toggleReadingList} onStart={startReading} onOpen={(id) => navigate(`/books/${id}`)} />
      : <AuthRequired onSignIn={() => signInFor('/cart')} onSignUp={() => navigate('/sign-up?next=%2Fcart')} />
  } else if (path === '/profile') {
    screen = user
      ? <ProfilePage books={catalog} user={user} reading={reading} favorites={favorites} readingList={readingList} onStart={startReading} onFavorite={toggleFavorite} onCart={toggleReadingList} onComplete={markCompleted} onOpen={(id) => navigate(`/books/${id}`)} onLogout={logout} />
      : <AuthRequired onSignIn={() => signInFor('/profile')} onSignUp={() => navigate('/sign-up?next=%2Fprofile')} />
  } else if (path.startsWith('/books/')) {
    screen = <BookDetailPage book={findCatalogBook(path.split('/')[2])} favorites={favorites} readingList={readingList} reading={reading} onFavorite={toggleFavorite} onCart={toggleReadingList} onStart={startReading} user={user} csrfToken={csrfToken} onSignIn={() => signInFor(route)} />
  } else if (path.startsWith('/reader/')) {
    const bookId = path.split('/')[2]
    const book = findCatalogBook(bookId)
    screen = user
      ? book?.hasPdf
        ? <PdfBookReader book={book} startPage={reading[bookId]?.chapter ?? (bookmarks[bookId] ?? 0)} bookmarkedPage={bookmarks[bookId] ?? null} loadPage={(pageIndex) => apiRequest(`/api/books/${encodeURIComponent(bookId)}/pages/${pageIndex + 1}`)} recordReadPage={(pageIndex) => recordReadPage(bookId, pageIndex + 1)} onProgress={(pageIndex, pageCount) => updatePdfPage(bookId, pageIndex, pageCount)} onBookmark={(pageIndex) => toggleBookmark(bookId, pageIndex)} onComplete={() => { markCompleted(bookId); navigate(`/books/${bookId}`) }} onExit={() => navigate(`/books/${bookId}`)} />
        : <ReaderPage book={book} progress={reading[bookId]} bookmark={bookmarks[bookId]} preferences={preferences} onPreferences={setPreferences} onChapter={updateChapter} onBookmark={toggleBookmark} onComplete={markCompleted} />
      : <AuthRequired reading onSignIn={() => signInFor(route)} onSignUp={() => navigate(`/sign-up?next=${encodeURIComponent(route)}`)} />
  } else if (path === '/blog') {
    screen = <BlogPage onNavigate={navigate} />
  } else if (path.startsWith('/blog/')) {
    screen = <BlogPostPage slug={path.replace('/blog/', '')} onNavigate={navigate} />
  } else if (path === '/about') {
    screen = <AboutPage onNavigate={navigate} />
  } else if (path === '/support' || path === '/contact') {
    screen = <SupportPage user={user} csrfToken={csrfToken} onSignIn={() => signInFor('/support')} />
  } else if (path === '/privacy') {
    screen = <LegalPage initialTab="privacy" onNavigate={navigate} />
  } else if (path === '/terms') {
    screen = <LegalPage initialTab="terms" onNavigate={navigate} />
  } else if (path === '/admin') {
    screen = user?.role === 'admin'
      ? <AdminDashboard stats={adminData.stats} books={adminData.books} month={adminMonth} onMonthChange={setAdminMonth} onRefresh={() => setAdminReload((value) => value + 1)} onUpload={uploadBook} loading={adminLoading} error={adminError} currentUser={user} request={(requestPath, options) => apiRequest(requestPath, { ...options, csrfToken })} onNavigate={navigate} onLogout={logout} onBooksChanged={refreshPublicBooks} />
      : user
        ? <AdminAccessDenied onHome={() => navigate('/')} />
        : <AuthRequired onSignIn={() => signInFor('/admin')} onSignUp={() => navigate('/sign-up?next=%2Fadmin')} />
  } else if (path === '/' || path === '') {
    screen = <HomePage books={catalog} genres={catalogGenres} favorites={favorites} readingList={readingList} onFavorite={toggleFavorite} onCart={toggleReadingList} onStart={startReading} onOpen={(id) => navigate(`/books/${id}`)} onNavigate={navigate} canRead={Boolean(user)} />
  } else {
    screen = <NotFoundPage onNavigate={navigate} />
  }

  if (authLoading || (booksLoading && (path.startsWith('/books/') || path.startsWith('/reader/')))) {
    return <div className="app-loading"><BookOpen size={22} /> Kitobxon yuklanmoqda…</div>
  }
  const inReader = path.startsWith('/reader/')
  const standalone = inReader || path === '/sign-in' || path === '/sign-up' || (path === '/admin' && user?.role === 'admin')
  if (standalone) return <>{screen}{notice && <div className="app-notice" role="status">{notice}</div>}</>

  return (
    <div className="app-shell">
      <Header path={path} user={user} />
      {notice && <div className="app-notice" role="status">{notice}<button aria-label="Yopish" onClick={() => setNotice('')}><X size={14} /></button></div>}
      <main key={route} className="fade-in">{screen}</main>
      <Footer />
      <MobileNav path={path} user={user} />
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
