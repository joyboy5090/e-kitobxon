import React, { useState } from 'react'
import { ArrowLeft, BookOpen, CircleUserRound, LogIn } from 'lucide-react'
import { Link, safeNextPath } from './common/Link.jsx'
import { apiRequest } from './common/api.js'
import CaptchaField from '../CaptchaField.jsx'

export function AuthPage({ mode, csrfToken, nextPath, onAuthenticated }) {
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
      <Link href="/" className="brand auth-brand">
        <span className="brand-mark"><BookOpen size={18} /></span>Kitobxon
      </Link>
      <section className="auth-card">
        <div className="section-kicker">Shaxsiy kutubxonangiz</div>
        <h1>{isRegister ? 'Akkaunt yarating' : 'Xush kelibsiz'}</h1>
        <p>{isRegister ? 'Ro‘yxatdan o‘ting va mutolaani davom ettiring.' : 'Kitoblaringiz va o‘qish jarayoningiz sizni kutmoqda.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && (
            <label>
              Gmail manzili
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="nom@gmail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={320}
                required
              />
            </label>
          )}
          {isRegister && (
            <label>
              Jinsingiz
              <select className="select-control" name="gender" value={gender} onChange={(event) => setGender(event.target.value)} required>
                <option value="">Tanlang</option>
                <option value="female">Ayol</option>
                <option value="male">Erkak</option>
                <option value="undisclosed">Ko‘rsatishni xohlamayman</option>
              </select>
              <small className="gender-privacy-note">Bu ma’lumot faqat umumiy statistikada hisoblanadi.</small>
            </label>
          )}
          <label>
            Username
            <input
              type="text"
              name="username"
              autoComplete="username"
              placeholder="Masalan: kitobsevar"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_]{3,24}"
              title="3–24 belgi: lotin harflari, raqam yoki _"
              required
            />
          </label>
          <label>
            Parol
            <input
              type="password"
              name="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder={isRegister ? 'Kamida 8 belgi' : 'Parolingiz'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={isRegister ? 8 : undefined}
              maxLength={128}
              required
            />
          </label>
          {isRegister && <CaptchaField value={captcha} onChange={setCaptcha} />}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button-primary auth-submit" type="submit" disabled={saving}>
            {saving ? 'Kutib turing…' : isRegister ? 'Ro‘yxatdan o‘tish' : 'Kirish'}
          </button>
          {isRegister && (
            <p className="auth-terms-note">
              Ro‘yxatdan o‘tish orqali siz <Link href="/terms">Foydalanish shartlari</Link> va <Link href="/privacy">Maxfiylik siyosati</Link>ga rozilik bildirasiz.
            </p>
          )}
        </form>
        <div className="auth-switch">
          {isRegister ? (
            <>Akkauntingiz bormi? <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Kirish</Link></>
          ) : (
            <>
              Akkauntingiz yo‘qmi? <Link href={`/sign-up?next=${encodeURIComponent(next)}`}>Ro‘yxatdan o‘tish</Link>
              <span className="auth-admin-link"><Link href="/sign-in?next=%2Fadmin">Admin paneliga kirish</Link></span>
            </>
          )}
        </div>
      </section>
      <Link href="/" className="auth-back"><ArrowLeft size={15} /> Bosh sahifaga qaytish</Link>
    </div>
  )
}

export function AdminAccessDenied({ onHome }) {
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

export function AuthRequired({ reading = false, onSignIn, onSignUp }) {
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
