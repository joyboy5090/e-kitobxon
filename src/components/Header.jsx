import React from 'react'
import { BookOpen, CircleUserRound, Heart, Home, Library, LogIn, Search, ShoppingCart } from 'lucide-react'
import { Link } from './common/Link.jsx'

export function Header({ path, user }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark"><BookOpen size={18} strokeWidth={1.8} /></span>
          Kitobxon
        </Link>
        <nav className="desktop-nav" aria-label="Asosiy navigatsiya">
          <Link href="/" className={`nav-link ${path === '/' ? 'active' : ''}`}>Bosh sahifa</Link>
          <Link href="/search" className={`nav-link ${path === '/search' ? 'active' : ''}`}>Kitoblar</Link>
          <Link href="/about" className={`nav-link ${path === '/about' ? 'active' : ''}`}>Biz haqimizda</Link>
          <Link href="/support" className={`nav-link ${path === '/support' ? 'active' : ''}`}>Yordam</Link>
        </nav>
        <div className="header-actions">
          <Link href="/search" className="icon-button" aria-label="Qidirish"><Search size={19} /></Link>
          {user ? (
            <>
              <Link href="/favorites" className={`icon-button ${path === '/favorites' ? 'avatar-button' : ''}`} aria-label="Sevimlilar" title="Sevimlilar">
                <Heart size={18} />
              </Link>
              <Link href="/cart" className={`icon-button ${path === '/cart' ? 'avatar-button' : ''}`} aria-label="Savatcha" title="Savatcha">
                <ShoppingCart size={18} />
              </Link>
              <Link href="/profile" className={`icon-button avatar-button ${path === '/profile' ? 'is-current' : ''}`} aria-label={`Akkaunt: ${user.username}`} title="Akkaunt">
                <CircleUserRound size={19} />
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="header-auth-link"><LogIn size={15} /> Kirish</Link>
              <Link href="/sign-up" className="button-primary header-signup">Ro‘yxatdan o‘tish</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export function MobileNav({ path, user }) {
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

  return (
    <nav className="mobile-nav" aria-label="Mobil navigatsiya">
      {items.map(({ href, text, icon: Icon, active }) => (
        <Link key={href} href={href} className={active ? 'active' : ''}>
          <Icon size={19} strokeWidth={1.8} />
          <span>{text}</span>
        </Link>
      ))}
    </nav>
  )
}
