import React, { useEffect, useState } from 'react'
import { RotateCw, ShieldCheck } from 'lucide-react'
import './captcha.css'

export default function CaptchaField({ value, onChange, error, onRefreshRef, hpValue = '', onHpChange }) {
  const [svg, setSvg] = useState('')
  const [loading, setLoading] = useState(false)

  const loadCaptcha = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/captcha', { credentials: 'same-origin' })
      const data = await res.json()
      if (data?.svg) setSvg(data.svg)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCaptcha()
    if (onRefreshRef) {
      onRefreshRef.current = loadCaptcha
    }
  }, [])

  return (
    <div className="kb-captcha-group">
      <div className="kb-captcha-label">
        <ShieldCheck size={15} />
        <span>Xavfsizlik tekshiruvi (Hisoblang):</span>
      </div>
      <div className="kb-captcha-row">
        <div
          className="kb-captcha-preview"
          dangerouslySetInnerHTML={{ __html: svg || '<div class="kb-captcha-loading">Yuklanmoqda...</div>' }}
          title="Hisoblang"
        />
        <button
          type="button"
          className="kb-captcha-refresh"
          onClick={loadCaptcha}
          disabled={loading}
          title="Kodni yangilash"
          aria-label="Kodni yangilash"
        >
          <RotateCw size={15} className={loading ? 'spin' : ''} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="Javob"
          className="kb-captcha-input"
          required
        />
      </div>
      {error && <span className="kb-captcha-error">{error}</span>}
      {/* Invisible Honeypot field — botlar buni avtomatik to'ldirib qo'yadi va tutiladi */}
      <input
        type="text"
        name="hp_website"
        value={hpValue}
        onChange={(e) => onHpChange?.(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
