import React from 'react'
import { Link } from './common/Link.jsx'

export function Footer() {
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
