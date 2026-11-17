import React, { useEffect, useState } from 'react'
import { ExternalLink, Sparkles } from 'lucide-react'
import { apiRequest } from './components/common/api.js'
import './ad-banner.css'

function isSafeHttpUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export default function AdBanner({ placement = 'all' }) {
  const [data, setData] = useState(null)
  const [currentBanner, setCurrentBanner] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/ads?placement=${encodeURIComponent(placement)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (cancelled || !res) return
        setData(res)
        if (res.banners && res.banners.length > 0) {
          // Tasodifiy faol banner tanlash
          const random = res.banners[Math.floor(Math.random() * res.banners.length)]
          setCurrentBanner(random)

          // Ko'rishlar sonini oshirish (sessiyada faqat bir marta bitta banner uchun)
          const sessionKey = `kb_ad_viewed_${random.id}`
          try {
            if (!sessionStorage.getItem(sessionKey)) {
              sessionStorage.setItem(sessionKey, '1')
              apiRequest(`/api/ads/${random.id}/view`, { method: 'POST' }).catch(() => {})
            }
          } catch {
            apiRequest(`/api/ads/${random.id}/view`, { method: 'POST' }).catch(() => {})
          }
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [placement])

  // Google AdSense skriptini dinamik yuklash (agar yoqilgan bo'lsa)
  useEffect(() => {
    if (data?.adsense?.enabled && data?.adsense?.clientId) {
      const scriptId = 'google-adsense-script'
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script')
        script.id = scriptId
        script.async = true
        script.crossOrigin = 'anonymous'
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${data.adsense.clientId}`
        document.head.appendChild(script)
      }
    }
  }, [data?.adsense])

  const handleClick = (banner) => {
    if (!banner?.id) return
    apiRequest(`/api/ads/${banner.id}/click`, { method: 'POST' }).catch(() => {})
  }

  // Agar homiylik banneri mavjud bo'lsa
  if (currentBanner) {
    return (
      <aside className="kb-ad-container" aria-label="Homiylik reklamasi">
        <a
          href={isSafeHttpUrl(currentBanner.linkUrl) ? currentBanner.linkUrl : '#'}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="kb-ad-banner"
          onClick={() => handleClick(currentBanner)}
        >
          <div className="kb-ad-badge">
            <Sparkles size={11} />
            <span>Hamkorlik</span>
          </div>

          <div className="kb-ad-content">
            {currentBanner.imageUrl && isSafeHttpUrl(currentBanner.imageUrl) ? (
              <img
                src={currentBanner.imageUrl}
                alt={currentBanner.title}
                className="kb-ad-image"
                loading="lazy"
              />
            ) : null}

            <div className="kb-ad-text">
              <h4 className="kb-ad-title">{currentBanner.title}</h4>
              <p className="kb-ad-desc">
                Kitobxon loyihasini qo‘llab-quvvatlovchi hamkorimiz sahifasiga o‘ting.
              </p>
            </div>

            <div className="kb-ad-action">
              <span>Batafsil</span>
              <ExternalLink size={14} />
            </div>
          </div>
        </a>
      </aside>
    )
  }

  // Agar AdSense yoqilgan bo'lsa
  if (data?.adsense?.enabled && data?.adsense?.clientId) {
    return (
      <aside className="kb-ad-container" aria-label="Reklama">
        <div style={{ minHeight: 90, width: '100%', textAlign: 'center' }}>
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={data.adsense.clientId}
            data-ad-slot="auto"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </aside>
    )
  }

  return null
}
