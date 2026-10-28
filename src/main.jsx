import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Atom, Baby, BookMarked, BookOpen, Bookmark, Check,
  ChevronLeft, ChevronRight, CircleUserRound, Globe2, Heart, HelpCircle, Home, Landmark, Library, List,
  LogIn, LogOut, Moon, Search, ShoppingCart, SlidersHorizontal, Smile, Sparkles, Star, Sun, Type, X
} from 'lucide-react'
import { books, genres } from './catalog'
import '../index.css'
import AdminDashboard from './AdminDashboard.jsx'
import SupportPage from './SupportPage.jsx'
import LegalPage from './LegalPage.jsx'
import AboutPage from './AboutPage.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import PdfBookReader from './PdfBookReader.jsx'
import CaptchaField from './CaptchaField.jsx'
import AdBanner from './AdBanner.jsx'

const readStore = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

async function apiRequest(path, { method = 'GET', body, csrfToken } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    headers['X-Kitobxon-Request'] = '1'
    headers['X-CSRF-Token'] = csrfToken || ''
  }
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'So‘rovni bajarib bo‘lmadi.')
  return data
}

function safeNextPath(value) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/'
}

function Link({ href, className = '', onClick, children, ...props }) {
  const handleClick = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onClick?.(event)
    window.history.pushState({}, '', href)
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return <a href={href} className={className} onClick={handleClick} {...props}>{children}</a>
}

function App() {
  const [route, setRoute] = useState(() => window.location.pathname + window.location.search)
  const [user, setUser] = useState(null)
  const [csrfToken, setCsrfToken] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [library, setLibrary] = useState({})
  const [uploadedBooks, setUploadedBooks] = useState([])
  const [notice, setNotice] = useState('')
  const [preferences, setPreferences] = useState(() => readStore('kitobxon-preferences', { dark: false, fontSize: 19, width: 'wide' }))
  const [adminMonth, setAdminMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [adminData, setAdminData] = useState({ stats: null, books: [] })
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminUploading, setAdminUploading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminSuccess, setAdminSuccess] = useState('')
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
    const saved = await saveBookState(id, {
      status: 'reading',
      chapter: current?.chapter ?? 0,
      progress: current?.progress || 4,
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
  const updatePdfPage = (id, pageIndex, pageCount) => saveBookState(id, {
    status: 'reading',
    chapter: pageIndex,
    progress: Math.max(1, Math.min(100, Math.round(((pageIndex + 1) / pageCount) * 100))),
  })
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
    setAdminUploading(true)
    setAdminError('')
    setAdminSuccess('')
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
      setAdminSuccess('Kitob va bet matnlari kutubxonaga saqlandi.')
      setAdminReload((value) => value + 1)
      return data.book
    } catch (error) {
      throw error
    } finally {
      setAdminUploading(false)
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
    screen = <BookDetail book={findCatalogBook(path.split('/')[2])} favorites={favorites} readingList={readingList} reading={reading} onFavorite={toggleFavorite} onCart={toggleReadingList} onStart={startReading} user={user} csrfToken={csrfToken} onSignIn={() => signInFor(route)} />
  } else if (path.startsWith('/reader/')) {
    const bookId = path.split('/')[2]
    const book = findCatalogBook(bookId)
    screen = user
      ? book?.hasPdf
        ? <PdfBookReader book={book} startPage={reading[bookId]?.chapter ?? (bookmarks[bookId] ?? 0)} bookmarkedPage={bookmarks[bookId] ?? null} loadPage={(pageIndex) => apiRequest(`/api/books/${encodeURIComponent(bookId)}/pages/${pageIndex + 1}`)} recordReadPage={(pageIndex) => recordReadPage(bookId, pageIndex + 1)} onProgress={(pageIndex, pageCount) => updatePdfPage(bookId, pageIndex, pageCount)} onBookmark={(pageIndex) => toggleBookmark(bookId, pageIndex)} onComplete={() => { markCompleted(bookId); navigate(`/books/${bookId}`) }} onExit={() => navigate(`/books/${bookId}`)} />
        : <ReaderPage book={book} progress={reading[bookId]} bookmark={bookmarks[bookId]} preferences={preferences} onPreferences={setPreferences} onChapter={updateChapter} onBookmark={toggleBookmark} onComplete={markCompleted} />
      : <AuthRequired reading onSignIn={() => signInFor(route)} onSignUp={() => navigate(`/sign-up?next=${encodeURIComponent(route)}`)} />
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

  if (authLoading) return <div className="app-loading"><BookOpen size={22} /> Kitobxon yuklanmoqda…</div>
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

function AuthPage({ mode, csrfToken, nextPath, onAuthenticated }) {
  const isRegister = mode === 'register'
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [renderedAt] = useState(() => Date.now())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const next = safeNextPath(nextPath)

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = await apiRequest(isRegister ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body: isRegister ? { email, username, password, gender, captcha, renderedAt } : { username, password },
        csrfToken,
      })
      await onAuthenticated(data, nextPath || (!isRegister && data.user.role === 'admin' ? '/admin' : '/'))
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="auth-screen">
      <Link href="/" className="brand auth-brand"><span className="brand-mark"><BookOpen size={18} /></span>Kitobxon</Link>
      <section className="auth-card">
        <div className="section-kicker">Shaxsiy kutubxonangiz</div>
        <h1>{isRegister ? 'Akkaunt yarating' : 'Xush kelibsiz'}</h1>
        <p>{isRegister ? 'Ro‘yxatdan o‘ting va mutolaani davom ettiring.' : 'Kitoblaringiz va o‘qish jarayoningiz sizni kutmoqda.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && <label>
            Gmail manzili
            <input type="email" name="email" autoComplete="email" placeholder="nom@gmail.com" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={320} required />
          </label>}
          {isRegister && <label>
            Jinsingiz
            <select className="select-control" name="gender" value={gender} onChange={(event) => setGender(event.target.value)} required>
              <option value="">Tanlang</option>
              <option value="female">Ayol</option>
              <option value="male">Erkak</option>
              <option value="undisclosed">Ko‘rsatishni xohlamayman</option>
            </select>
            <small className="gender-privacy-note">Bu ma’lumot faqat umumiy statistikada hisoblanadi.</small>
          </label>}
          <label>
            Username
            <input type="text" name="username" autoComplete="username" placeholder="Masalan: kitobsevar" value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" title="3–24 belgi: lotin harflari, raqam yoki _" required />
          </label>
          <label>
            Parol
            <input type="password" name="password" autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder={isRegister ? 'Kamida 8 belgi' : 'Parolingiz'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={isRegister ? 8 : undefined} maxLength={128} required />
          </label>
          {isRegister && <CaptchaField value={captcha} onChange={setCaptcha} />}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button-primary auth-submit" type="submit" disabled={saving}>{saving ? 'Kutib turing…' : isRegister ? 'Ro‘yxatdan o‘tish' : 'Kirish'}</button>
          {isRegister && (
            <p className="auth-terms-note">
              Ro‘yxatdan o‘tish orqali siz <Link href="/terms">Foydalanish shartlari</Link> va <Link href="/privacy">Maxfiylik siyosati</Link>ga rozilik bildirasiz.
            </p>
          )}
        </form>
        <div className="auth-switch">
          {isRegister ? <>Akkauntingiz bormi? <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Kirish</Link></> : <>Akkauntingiz yo‘qmi? <Link href={`/sign-up?next=${encodeURIComponent(next)}`}>Ro‘yxatdan o‘tish</Link><span className="auth-admin-link"><Link href="/sign-in?next=%2Fadmin">Admin paneliga kirish</Link></span></>}
        </div>
      </section>
      <Link href="/" className="auth-back"><ArrowLeft size={15} /> Bosh sahifaga qaytish</Link>
    </div>
  )
}

function AdminAccessDenied({ onHome }) {
  return (
    <div className="page-content auth-required-wrap">
      <div className="empty-state auth-required">
        <CircleUserRound size={31} />
        <h1>Bu bo‘lim faqat admin uchun</h1>
        <p>Sizning akkauntingizda boshqaruv paneliga kirish huquqi yo‘q.</p>
        <div className="auth-required-actions">
          <button className="button-primary" onClick={onHome}>Bosh sahifaga qaytish</button>
        </div>
      </div>
    </div>
  )
}

function AuthRequired({ reading = false, onSignIn, onSignUp }) {
  return (
    <div className="page-content auth-required-wrap">
      <div className="empty-state auth-required">
        <CircleUserRound size={31} />
        <h1>{reading ? 'O‘qish uchun akkauntga kiring' : 'Shaxsiy bo‘lim'}</h1>
        <p>{reading ? 'Kitobning namuna matnini ochish uchun avval ro‘yxatdan o‘ting yoki akkauntingizga kiring.' : 'Sevimlilar, o‘qish ro‘yxati va akkaunt sahifasi faqat kirgan foydalanuvchilarga ochiq.'}</p>
        <div className="auth-required-actions">
          <button className="button-primary" onClick={onSignIn}><LogIn size={16} /> Kirish</button>
          <button className="button-secondary" onClick={onSignUp}>Ro‘yxatdan o‘tish</button>
        </div>
      </div>
    </div>
  )
}

function Header({ path, user }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand"><span className="brand-mark"><BookOpen size={18} strokeWidth={1.8} /></span>Kitobxon</Link>
        <nav className="desktop-nav" aria-label="Asosiy navigatsiya">
          <Link href="/" className={`nav-link ${path === '/' ? 'active' : ''}`}>Bosh sahifa</Link>
          <Link href="/search" className={`nav-link ${path === '/search' ? 'active' : ''}`}>Kitoblar</Link>
          <Link href="/about" className={`nav-link ${path === '/about' ? 'active' : ''}`}>Biz haqimizda</Link>
          <Link href="/support" className={`nav-link ${path === '/support' ? 'active' : ''}`}>Yordam</Link>
        </nav>
        <div className="header-actions">
          <Link href="/search" className="icon-button" aria-label="Qidirish"><Search size={19} /></Link>
          {user ? <>
            <Link href="/favorites" className={`icon-button ${path === '/favorites' ? 'avatar-button' : ''}`} aria-label="Sevimlilar" title="Sevimlilar"><Heart size={18} /></Link>
            <Link href="/cart" className={`icon-button ${path === '/cart' ? 'avatar-button' : ''}`} aria-label="Savatcha" title="Savatcha"><ShoppingCart size={18} /></Link>
            <Link href="/profile" className={`icon-button avatar-button ${path === '/profile' ? 'is-current' : ''}`} aria-label={`Akkaunt: ${user.username}`} title="Akkaunt"><CircleUserRound size={19} /></Link>
          </> : <>
            <Link href="/sign-in" className="header-auth-link"><LogIn size={15} /> Kirish</Link>
            <Link href="/sign-up" className="button-primary header-signup">Ro‘yxatdan o‘tish</Link>
          </>}
        </div>
      </div>
    </header>
  )
}

function MobileNav({ path, user }) {
  const items = user ? [
    { href: '/', text: 'Bosh sahifa', icon: Home, active: path === '/' },
    { href: '/search', text: 'Kitoblar', icon: Library, active: path === '/search' },
    { href: '/favorites', text: 'Sevimlilar', icon: Heart, active: path === '/favorites' },
    { href: '/cart', text: 'Savatcha', icon: ShoppingCart, active: path === '/cart' },
    { href: '/profile', text: 'Akkaunt', icon: CircleUserRound, active: path === '/profile' }
  ] : [
    { href: '/', text: 'Bosh sahifa', icon: Home, active: path === '/' },
    { href: '/search', text: 'Kitoblar', icon: Library, active: path === '/search' },
    { href: '/favorites', text: 'Sevimlilar', icon: Heart, active: path === '/favorites' },
    { href: '/sign-in', text: 'Kirish', icon: LogIn, active: path === '/sign-in' }
  ]
  return <nav className="mobile-nav" aria-label="Mobil navigatsiya">{items.map(({ href, text, icon: Icon, active }) => <Link key={href} href={href} className={active ? 'active' : ''}><Icon size={19} strokeWidth={1.8} /><span>{text}</span></Link>)}</nav>
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <span>© {new Date().getFullYear()} e-kitobxon.uz · Mutolaa uchun sokin makon</span>
          <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 11, color: '#887c72', flexWrap: 'wrap' }}>
            <span>Email: <a href="mailto:quvondiq5090@gmail.com" style={{ textDecoration: 'underline', color: 'inherit' }}>quvondiq5090@gmail.com</a></span>
            <span>•</span>
            <span>Telegram: <a href="https://t.me/quvondiq0903" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>@quvondiq0903</a></span>
          </div>
        </div>
        <div className="footer-links-group">
          <Link href="/about" className="footer-link-item">
            Biz haqimizda
          </Link>
          <span>•</span>
          <Link href="/terms" className="footer-link-item">
            Foydalanish shartlari
          </Link>
          <span>•</span>
          <Link href="/privacy" className="footer-link-item">
            Maxfiylik siyosati
          </Link>
          <span>•</span>
          <Link href="/support" className="footer-link-item">
            Aloqa va yordam
          </Link>
        </div>
      </div>
    </footer>
  )
}

function BookCover({ book, className = '' }) {
  return (
    <div className={`book-cover ${className}`} style={{ background: `linear-gradient(145deg, ${book.color}, ${book.color} 60%, ${book.accent})` }}>
      <span className="cover-author">{book.author}</span>
      <strong className="cover-title">{book.title}</strong>
      <span className="cover-seal">Kitobxon nashri</span>
    </div>
  )
}

function BookCard({ book, favorite, inReadingList, canRead, onFavorite, onCart, onStart, onOpen }) {
  return (
    <article className="book-card">
      <Link href={`/books/${book.id}`} className="cover-wrap" aria-label={`${book.title} tafsilotlari`}><BookCover book={book} /></Link>
      <div className="card-content">
        <span className="genre-label">{book.genre}</span>
        <Link href={`/books/${book.id}`}><h3>{book.title}</h3></Link>
        <span className="author">{book.author}</span>
        <p className="description">{book.description}</p>
        <div className="card-bottom">
          <span className="rating"><Star size={13} fill="currentColor" strokeWidth={0} />{book.rating}</span>
          <div className="card-actions">
            <button className="start-link" onClick={() => canRead ? onStart(book.id) : onOpen(book.id)}>{canRead ? 'O‘qish' : 'Batafsil'} <ArrowRight size={13} /></button>
            <button className={`favorite-button ${favorite ? 'is-favorite' : ''}`} onClick={() => onFavorite(book.id)} aria-label={favorite ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo‘shish'}><Heart size={17} fill={favorite ? 'currentColor' : 'none'} /></button>
            <button className={`favorite-button cart-button ${inReadingList ? 'is-favorite' : ''}`} onClick={() => onCart(book.id)} aria-label={inReadingList ? 'O‘qish ro‘yxatidan olib tashlash' : 'O‘qish ro‘yxatiga qo‘shish'} title="O‘qish ro‘yxati"><ShoppingCart size={16} /></button>
          </div>
        </div>
      </div>
    </article>
  )
}

function SectionHeading({ kicker, title, link, href }) {
  return <div className="section-heading"><div><div className="section-kicker">{kicker}</div><h2>{title}</h2></div>{link && <Link href={href} className="text-link">{link}<ArrowUpRight size={15} /></Link>}</div>
}

function HomePage({ books, genres, favorites, readingList, onFavorite, onCart, onStart, onOpen, onNavigate, canRead }) {
  const [search, setSearch] = useState('')
  const submit = (event) => {
    event.preventDefault()
    onNavigate(`/search?q=${encodeURIComponent(search.trim())}`)
  }
  const categoryIcon = [BookOpen, Heart, Smile, Search, Atom, Globe2, Landmark, Baby]
  return (
    <div className="page-content">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Kitob bilan o‘tgan vaqt — o‘zingizga sovg‘a</div>
          <h1>Sevimli kitoblaringizni istalgan joyda o‘qing.</h1>
          <p>O‘zbek va jahon adabiyotining sara asarlarini bir joyda kashf eting.</p>
          <form className="search-form" onSubmit={submit}>
            <Search size={18} color="#9b8c7e" />
            <input aria-label="Kitob qidirish" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kitob, muallif yoki janrni qidiring..." />
            <button className="button-primary" type="submit">Qidirish</button>
          </form>
        </div>
        <div className="hero-art" aria-label="Kitob muqovasi tasviri">
          <div className="hero-book"><small>Abdulla Qodiriy</small><strong>O‘tkan<br />kunlar</strong><span>ROMAN</span></div>
          <div className="floating-note">«Mutolaa — qalbning sayri»</div>
        </div>
      </section>

      <section className="section">
        <SectionHeading kicker="O‘quvchilar tanlovi" title="Mashhur kitoblar" link="Barcha kitoblar" href="/search?sort=popular" />
        <div className="book-grid">{books.slice(0, 3).map((book) => <BookCard key={book.id} book={book} favorite={favorites.includes(book.id)} inReadingList={readingList.includes(book.id)} canRead={canRead} onFavorite={onFavorite} onCart={onCart} onStart={onStart} onOpen={onOpen} />)}</div>
      </section>

      <AdBanner placement="home_top" />

      <section className="section">
        <SectionHeading kicker="Kayfiyatingizga mosini toping" title="Janr bo‘yicha kashf eting" />
        <div className="genre-strip">{genres.map((genre, index) => {
          const Icon = categoryIcon[index] || BookOpen
          return <Link key={genre} href={`/search?genre=${encodeURIComponent(genre)}`} className="genre-chip"><span>{genre}</span><Icon size={17} strokeWidth={1.7} /></Link>
        })}</div>
      </section>

      <section className="quote-band">
        <div className="quote-copy"><p>“Kitob o‘qigan inson ming umr yashaydi.”</p><small>Har kuni o‘zingiz uchun bir sahifa</small></div>
        <div className="quote-aside"><BookOpen size={32} strokeWidth={1.3} /></div>
      </section>

      <section className="section" style={{ paddingTop: 0, paddingBottom: 60 }}>
        <SectionHeading kicker="Yangi nigohlar, tanish tuyg‘ular" title="Yana bir sahifa oching" link="Hammasini ko‘rish" href="/search" />
        <div className="book-grid">{books.slice(3).map((book) => <BookCard key={book.id} book={book} favorite={favorites.includes(book.id)} inReadingList={readingList.includes(book.id)} canRead={canRead} onFavorite={onFavorite} onCart={onCart} onStart={onStart} onOpen={onOpen} />)}</div>
      </section>
    </div>
  )
}

function SearchPage({ books, genres, query, genre, querySort, favorites, readingList, onFavorite, onCart, onStart, onNavigate, canRead }) {
  const [text, setText] = useState(query)
  const [activeGenre, setActiveGenre] = useState(genre)
  const [sort, setSort] = useState(querySort || 'recommended')
  useEffect(() => { setText(query); setActiveGenre(genre); setSort(querySort || 'recommended') }, [query, genre, querySort])
  const normalized = text.trim().toLocaleLowerCase()
  let results = books.filter((book) => {
    const corpus = `${book.title} ${book.author} ${book.genre} ${book.group} ${book.description}`.toLocaleLowerCase()
    const textMatch = !normalized || corpus.includes(normalized)
    if (!activeGenre) return textMatch
    const genreMatch = (book.categories || []).some((category) => category.toLocaleLowerCase() === activeGenre.toLocaleLowerCase())
    return textMatch && genreMatch
  })
  if (sort === 'rating' || sort === 'popular') results = [...results].sort((a, b) => Number(b.rating) - Number(a.rating))
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
      <div className="page-title"><div className="section-kicker">Siz uchun tanlangan</div><h1>{activeGenre || (query ? 'Qidiruv natijalari' : 'Kitoblar olami')}</h1><p>Yuragingizga yaqin hikoyani shu yerdan toping.</p></div>
      <div className="search-tools">
        <form className="search-form" onSubmit={submit}><Search size={18} color="#9b8c7e" /><input aria-label="Qidiruv" value={text} onChange={(event) => setText(event.target.value)} placeholder="Kitob, muallif yoki janrni qidiring..." />{text && <button className="icon-button" type="button" aria-label="Qidiruvni tozalash" onClick={() => setText('')}><X size={15} /></button>}<button className="button-primary" type="submit">Qidirish</button></form>
        <select className="select-control" value={activeGenre} onChange={(event) => setActiveGenre(event.target.value)} aria-label="Janr bo‘yicha tanlash"><option value="">Barcha janrlar</option>{genres.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="select-control" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Saralash"><option value="recommended">Tavsiya etilgan</option><option value="popular">Mashhurligi bo‘yicha</option><option value="rating">Yuqori baho</option><option value="title">Alifbo bo‘yicha</option></select>
      </div>
      <p className="result-note">{results.length} ta kitob topildi{activeGenre ? ` · ${activeGenre}` : ''}</p>
      {results.length ? <div className="book-grid">{results.map((book) => <BookCard key={book.id} book={book} favorite={favorites.includes(book.id)} inReadingList={readingList.includes(book.id)} canRead={canRead} onFavorite={onFavorite} onCart={onCart} onStart={onStart} onOpen={(id) => onNavigate(`/books/${id}`)} />)}</div> : <div className="empty-state"><Search size={30} /><h2>Bu safar kitob topilmadi</h2><p>Boshqa so‘z yoki janr bilan yana bir bor qidirib ko‘ring.</p><button className="button-secondary" onClick={() => { setText(''); setActiveGenre('') }}>Barcha kitoblarga qaytish</button></div>}
      <div style={{ height: 70 }} />
    </div>
  )
}

function FavoritesPage({ books, favorites, readingList, onFavorite, onCart, onStart, onOpen }) {
  const selected = books.filter((book) => favorites.includes(book.id))
  return (
    <div className="page-content">
      <div className="page-title"><div className="section-kicker">Qayta uchrashish uchun</div><h1>Sevimlilar</h1><p>Ko‘nglingizga yaqin kitoblar shu yerda saqlanadi.</p></div>
      {selected.length ? <div className="book-grid">{selected.map((book) => <BookCard key={book.id} book={book} favorite inReadingList={readingList.includes(book.id)} canRead onFavorite={onFavorite} onCart={onCart} onStart={onStart} onOpen={onOpen} />)}</div> : <div className="empty-state"><Heart size={30} /><h2>Sevimli kitoblaringiz hali yo‘q</h2><p>Kitob kartasidagi yurak belgisini bosib, yoqtirganlaringizni shu yerga jamlang.</p><Link href="/search" className="button-primary">Kitoblarni kashf etish <ArrowRight size={15} /></Link></div>}
      <div style={{ height: 100 }} />
    </div>
  )
}

function ReadingListPage({ books, readingList, favorites, onFavorite, onCart, onStart, onOpen }) {
  const selected = books.filter((book) => readingList.includes(book.id))
  return (
    <div className="page-content">
      <div className="page-title"><div className="section-kicker">Keyin mutolaa qilish uchun</div><h1>O‘qish ro‘yxati</h1><p>Keyinroq o‘qimoqchi bo‘lgan kitoblaringiz shu yerda saqlanadi.</p></div>
      {selected.length ? <div className="book-grid">{selected.map((book) => <BookCard key={book.id} book={book} favorite={favorites.includes(book.id)} inReadingList canRead onFavorite={onFavorite} onCart={onCart} onStart={onStart} onOpen={onOpen} />)}</div> : <div className="empty-state"><ShoppingCart size={30} /><h2>O‘qish ro‘yxati hozircha bo‘sh</h2><p>Kitob kartasidagi savatcha belgisini bosib, keyin o‘qimoqchi bo‘lganlaringizni saqlang.</p><Link href="/search" className="button-primary">Kitoblarni kashf etish <ArrowRight size={15} /></Link></div>}
      <div style={{ height: 100 }} />
    </div>
  )
}

function BookDetail({ book, favorites, readingList, reading, onFavorite, onCart, onStart, user, csrfToken, onSignIn }) {
  if (!book) return <div className="page-content"><div className="empty-state"><BookOpen size={30} /><h2>Kitob topilmadi</h2><p>Bu kitob katalogda mavjud emas.</p><Link href="/search" className="button-primary">Kitoblarga qaytish</Link></div></div>
  const progress = reading[book.id]
  return (
    <div className="page-content">
      <div className="detail-layout">
        <div className="detail-cover-stage"><BookCover book={book} /></div>
        <div className="detail-copy">
          <div className="section-kicker">{book.group} · {book.genre}</div>
          <h1>{book.title}</h1><div className="detail-author">{book.author}</div>
          <span className="rating"><Star size={15} fill="currentColor" strokeWidth={0} />{book.rating} <span style={{ color: '#9b8e83', fontWeight: 400 }}>· o‘quvchilar bahosi</span></span>
          <div className="detail-meta">
            <div className="meta-item"><span>Hajmi</span><span>{book.pages} sahifa</span></div>
            <div className="meta-item"><span>Nashr</span><span>{book.published}</span></div>
            <div className="meta-item"><span>Til</span><span>O‘zbekcha</span></div>
          </div>
          <p className="detail-description">{book.description}</p>
          <div className="detail-actions">
            <button className="button-primary" onClick={() => onStart(book.id)}><BookOpen size={16} />{user ? progress?.status === 'reading' ? 'O‘qishni davom ettirish' : 'O‘qishni boshlash' : 'O‘qish uchun kirish'}</button>
            <button className="button-secondary" onClick={() => onFavorite(book.id)}><Heart size={16} fill={favorites.includes(book.id) ? 'currentColor' : 'none'} />{favorites.includes(book.id) ? 'Sevimlilarda' : 'Sevimlilarga qo‘shish'}</button>
            <button className="button-secondary" onClick={() => onCart(book.id)}><ShoppingCart size={16} />{readingList.includes(book.id) ? 'Ro‘yxatda' : 'O‘qish ro‘yxatiga'}</button>
          </div>
          {progress?.status === 'reading' && <div className="detail-progress">O‘qish jarayoni · {progress.progress}%<div className="progress-line"><span style={{ width: `${progress.progress}%` }} /></div></div>}
        </div>
      </div>
      <div className="section" style={{ borderTop: '1px solid var(--line)', paddingTop: 34, paddingBottom: 56 }}>
        <SectionHeading kicker="Mutolaa uchun" title="Asar haqida" />
        <p className="detail-description" style={{ maxWidth: 760 }}>{book.description} Ushbu sahifadagi parcha tanishuv uchun berilgan qisqa namuna bo‘lib, to‘liq nashr matni emas.</p>
      </div>
      <AdBanner placement="book_detail" />
      <BookReviews bookId={book.id} user={user} csrfToken={csrfToken} onSignIn={onSignIn} />
    </div>
  )
}

function BookReviews({ bookId, user, csrfToken, onSignIn }) {
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
      {user ? <form className="review-form" onSubmit={submit}>
        <label className="review-label">Yulduzli baho</label>
        <div className="star-picker" role="radiogroup" aria-label="Kitobga baho berish">
          {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} yulduz`} onClick={() => setRating(value)} className={value <= rating ? 'selected' : ''}><Star size={25} fill={value <= rating ? 'currentColor' : 'none'} /></button>)}
        </div>
        <label className="review-label" htmlFor={`review-${bookId}`}>Izohingiz</label>
        <textarea id={`review-${bookId}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} placeholder="Kitob haqidagi fikringizni yozing…" required />
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button-primary" type="submit" disabled={saving || !comment.trim()}>{saving ? 'Saqlanmoqda…' : data.myReview ? 'Izohni yangilash' : 'Bahoni yuborish'}</button>
      </form> : <div className="review-login-prompt"><span>Baho berish va izoh qoldirish uchun akkauntga kiring.</span><button className="button-secondary" onClick={onSignIn}>Kirish</button></div>}
      {data.reviews.length ? <div className="review-list">{data.reviews.map((review, index) => <article className="review-item" key={`${review.username}-${review.createdAt}-${index}`}>
        <div className="review-heading"><strong>{review.username}</strong><span>{new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'medium' }).format(new Date(review.updatedAt || review.createdAt))}</span></div>
        <div className="review-stars" aria-label={`${review.rating} yulduz`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={14} fill={value <= review.rating ? 'currentColor' : 'none'} />)}</div>
        <p>{review.comment}</p>
      </article>)}</div> : <div className="reviews-empty">Birinchi bo‘lib fikr bildiring.</div>}
    </section>
  )
}

function ReaderPage({ book, progress, bookmark, preferences, onPreferences, onChapter, onBookmark, onComplete }) {
  const [showSettings, setShowSettings] = useState(false)
  const [chapterIndex, setChapterIndex] = useState(progress?.chapter ?? (bookmark ?? 0))
  useEffect(() => setChapterIndex(progress?.chapter ?? (bookmark ?? 0)), [book?.id])
  if (!book) return <div className="empty-state"><BookOpen size={30} /><h2>Kitob topilmadi</h2><Link href="/search" className="button-primary">Kitoblarga qaytish</Link></div>
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
        <Link href={`/books/${book.id}`} className="reader-back"><ArrowLeft size={18} /> Kitobga qaytish</Link>
        <div className="reader-book-name">{book.title}<small>{book.author}</small></div>
        <div className="reader-actions">
          <button className="reader-tool" onClick={() => setShowSettings((value) => !value)} aria-label="O‘qish sozlamalari"><SlidersHorizontal size={17} /><span>Ko‘rinish</span></button>
          <button className="reader-tool" onClick={() => setPreference({ dark: !preferences.dark })} aria-label={preferences.dark ? 'Yorug‘ rejim' : 'Tungi rejim'}>{preferences.dark ? <Sun size={17} /> : <Moon size={17} />}</button>
          <button className="reader-tool" onClick={() => onBookmark(book.id, chapterIndex)} aria-label={isBookmarked ? 'Xatcho‘pni olib tashlash' : 'Xatcho‘p qo‘yish'}><Bookmark size={17} fill={isBookmarked ? 'currentColor' : 'none'} /></button>
        </div>
        <div className="reader-progress-top"><span style={{ width: `${progress?.status === 'completed' ? 100 : progress?.progress || 4}%` }} /></div>
        {showSettings && <div className="reader-controls-popover">
          <div className="control-row"><span><Type size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Matn o‘lchami</span><div className="control-toggle">{[17, 19, 22].map((size) => <button key={size} className={preferences.fontSize === size ? 'selected' : ''} onClick={() => setPreference({ fontSize: size })}>{size}</button>)}</div></div>
          <div className="control-row"><span>O‘qish kengligi</span><div className="control-toggle">{[['wide', 'Keng'], ['narrow', 'Ixcham']].map(([value, label]) => <button key={value} className={preferences.width === value ? 'selected' : ''} onClick={() => setPreference({ width: value })}>{label}</button>)}</div></div>
        </div>}
      </div>
      <div className="reader-layout">
        <aside className="toc-panel"><h3><List size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />Mundarija</h3>{book.chapters.map((item, index) => <button key={item.title} className={`toc-item ${index === chapterIndex ? 'active' : ''}`} onClick={() => goToChapter(index)}>{String(index + 1).padStart(2, '0')} &nbsp; {item.title}</button>)}</aside>
        <article className={`reader-content ${preferences.width === 'narrow' ? 'narrow' : ''}`}>
          <header className="reader-heading"><div className="chapter-label">{book.title}</div><h1>{chapter.title}</h1><p>{String(chapterIndex + 1).padStart(2, '0')} / {String(book.chapters.length).padStart(2, '0')} · qisqa namuna</p></header>
          <div className="demo-banner"><Sparkles size={14} /><span>Mutolaa namunasi — bu asardan tanlangan qisqa parcha. To‘liq matn nashri emas.</span></div>
          <div className="reader-text" style={{ fontSize: `${preferences.fontSize}px` }}>{chapter.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          <div className="reader-bottom">
            <button className="button-secondary" disabled={chapterIndex === 0} onClick={() => goToChapter(chapterIndex - 1)}><ChevronLeft size={15} />Avvalgi bob</button>
            <div className="chapter-progress">Mutolaa jarayoni<br /><strong>{progress?.status === 'completed' ? 100 : progress?.progress || 4}%</strong></div>
            {chapterIndex === book.chapters.length - 1
              ? <button className="button-primary" onClick={() => { onComplete(book.id); window.history.pushState({}, '', `/books/${book.id}`); window.dispatchEvent(new PopStateEvent('popstate')) }}><Check size={15} />Tugatdim</button>
              : <button className="button-primary" onClick={() => goToChapter(chapterIndex + 1)}>Keyingi bob<ChevronRight size={15} /></button>}
          </div>
        </article>
      </div>
    </div>
  )
}

function ProfilePage({ books, user, reading, favorites, readingList, onStart, onFavorite, onCart, onComplete, onOpen, onLogout }) {
  const current = books.filter((book) => reading[book.id]?.status === 'reading')
  const completed = books.filter((book) => reading[book.id]?.status === 'completed')
  const saved = books.filter((book) => favorites.includes(book.id))
  const readPages = completed.reduce((total, book) => total + book.pages, 0) + current.reduce((total, book) => total + Math.round(book.pages * reading[book.id].progress / 100), 0)
  const initials = user.username.slice(0, 2).toLocaleUpperCase()
  return (
    <div className="page-content">
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-user-copy"><div className="section-kicker">Shaxsiy kutubxonangiz</div><h1>{user.username}</h1><p>{user.email}</p></div>
        <div className="profile-actions">
          <Link href="/cart" className="button-secondary"><ShoppingCart size={15} /> O‘qish ro‘yxati · {readingList.length}</Link>
          <button className="button-secondary" onClick={onLogout}><LogOut size={15} /> Chiqish</button>
        </div>
      </div>
      <div className="stats-row">
        <div className="stat-card"><span>Mutolaa sahifalari</span><strong>{readPages.toLocaleString('uz')}</strong></div>
        <div className="stat-card"><span>O‘qilayotgan</span><strong>{current.length}</strong></div>
        <div className="stat-card"><span>Tugallangan</span><strong>{completed.length}</strong></div>
      </div>
      <section className="profile-section"><h2>O‘qilayotgan kitoblar</h2>
        {current.length ? current.map((book) => <ReadingRow key={book.id} book={book} progress={reading[book.id]} onStart={onStart} onComplete={onComplete} />) : <div className="empty-state"><BookOpen size={27} /><h2>Hozircha mutolaa boshlanmagan</h2><p>Bir kitob tanlang. Keyin uni davom ettirish shu yerdan oson.</p><Link href="/search" className="button-primary">Kitob topish</Link></div>}
      </section>
      <section className="profile-section"><h2>Tugallangan kitoblar</h2>
        {completed.length ? completed.map((book) => <ReadingRow key={book.id} book={book} progress={reading[book.id]} onStart={onStart} completed />) : <div className="empty-state"><Check size={27} /><h2>Hali tugallangan kitob yo‘q</h2><p>Mutolaani yakunlaganingizda kitob shu yerda paydo bo‘ladi.</p></div>}
      </section>
      <section className="profile-section" style={{ paddingBottom: 60 }}><SectionHeading kicker="Qayta ochish uchun" title="Sevimli kitoblar" link="Barchasi" href="/favorites" />
        {saved.length ? <div className="book-grid">{saved.slice(0, 3).map((book) => <BookCard key={book.id} book={book} favorite inReadingList={readingList.includes(book.id)} canRead onFavorite={onFavorite} onCart={onCart} onStart={onStart} onOpen={onOpen} />)}</div> : <div className="empty-state"><Heart size={27} /><h2>Hali sevimlilar saqlanmadi</h2><p>Yoqtirgan kitoblaringizni yurak belgisi bilan saqlang.</p><Link href="/search" className="button-secondary">Katalogni ko‘rish</Link></div>}
      </section>
    </div>
  )
}

function ReadingRow({ book, progress, onStart, onComplete, completed }) {
  return <div className="reading-row">
    <Link href={`/books/${book.id}`}><BookCover book={book} /></Link>
    <div><Link href={`/books/${book.id}`}><h3>{book.title}</h3></Link><p>{completed ? 'Tugallangan asar' : `${progress.progress}% · ${book.author}`}</p>{!completed && <div className="progress-line"><span style={{ width: `${progress.progress}%` }} /></div>}</div>
    {completed ? <span className="completed-mark"><Check size={15} />Tugallandi</span> : <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><button className="button-secondary" onClick={() => onComplete(book.id)}>Tugatdim</button><button className="button-primary" onClick={() => onStart(book.id)}>Davom etish</button></div>}
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
