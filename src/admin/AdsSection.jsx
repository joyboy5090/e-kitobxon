import React, { useCallback, useEffect, useState } from 'react'
import { Megaphone, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog, displayNumber, Empty, errorText, Modal, Skeleton } from './AdminCommon.jsx'

export function AdsSection({ api, notify }) {
  const [banners, setBanners] = useState([])
  const [adsense, setAdsense] = useState({ clientId: 'ca-pub-1115153746763009', enabled: true })
  const [loading, setLoading] = useState(true)
  const [savingAdsense, setSavingAdsense] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    placement: 'all',
    isActive: true,
  })
  const [creating, setCreating] = useState(false)

  const loadAds = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api('/api/admin/ads')
      setBanners(data.banners || [])
      setAdsense({
        clientId: data.adsense?.clientId || 'ca-pub-1115153746763009',
        enabled: data.adsense?.enabled ?? true,
      })
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setLoading(false)
    }
  }, [api, notify])

  useEffect(() => {
    loadAds()
  }, [loadAds])

  const handleSaveAdsense = async (e) => {
    e.preventDefault()
    setSavingAdsense(true)
    try {
      await api('/api/admin/ads/adsense-config', {
        method: 'POST',
        body: adsense,
      })
      notify('success', 'Google AdSense sozlamalari muvaffaqiyatli saqlandi!')
      loadAds()
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setSavingAdsense(false)
    }
  }

  const handleCreateBanner = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.linkUrl.trim()) {
      notify('error', 'Sarlavha va havola (link) kiritilishi shart.')
      return
    }
    setCreating(true)
    try {
      await api('/api/admin/ads', {
        method: 'POST',
        body: form,
      })
      notify('success', 'Yangi reklama banneri muvaffaqiyatli qo‘shildi!')
      setModalOpen(false)
      setForm({ title: '', imageUrl: '', linkUrl: '', placement: 'all', isActive: true })
      loadAds()
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (banner) => {
    try {
      await api(`/api/admin/ads/${banner.id}`, {
        method: 'PATCH',
        body: { isActive: !banner.isActive },
      })
      notify('success', `Reklama ${!banner.isActive ? 'faollashtirildi' : 'to‘xtatildi'}.`)
      loadAds()
    } catch (err) {
      notify('error', errorText(err))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api(`/api/admin/ads/${deleteTarget.id}`, { method: 'DELETE' })
      notify('success', 'Reklama banneri o‘chirildi.')
      setDeleteTarget(null)
      loadAds()
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setDeleting(false)
    }
  }

  const totalViews = banners.reduce((sum, b) => sum + (b.viewsCount || 0), 0)
  const totalClicks = banners.reduce((sum, b) => sum + (b.clicksCount || 0), 0)
  const averageCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Google AdSense kartasi */}
      <section className="ap-section">
        <div className="ap-section__head">
          <div>
            <h2>Google AdSense integratsiyasi</h2>
            <p>Google tomonidan berilgan Publisher ID (ca-pub-...) orqali avtomatik reklamalarni yoqing</p>
          </div>
          <span className={`ap-tag ${adsense.enabled && adsense.clientId ? 'ap-tag--active' : ''}`}>
            {adsense.enabled && adsense.clientId ? '● AdSense Faol' : '○ AdSense Nofaol'}
          </span>
        </div>

        <form onSubmit={handleSaveAdsense} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
          <label className="ap-label">
            <span>Google AdSense Publisher ID (Mijoz ID)</span>
            <input
              type="text"
              placeholder="Masalan: ca-pub-1234567890123456"
              value={adsense.clientId}
              onChange={(e) => setAdsense({ ...adsense, clientId: e.target.value.trim() })}
              className="ap-input"
            />
            <small style={{ color: 'var(--muted)', marginTop: 4, display: 'block' }}>
              Ushbu ID kiritilishi bilan saytingizda avtomatik <code>e-kitobxon.uz/ads.txt</code> fayli shakllanadi.
            </small>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: '4px 0' }}>
            <input
              type="checkbox"
              checked={adsense.enabled}
              onChange={(e) => setAdsense({ ...adsense, enabled: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <strong>Google AdSense avtomatik reklamalarini (Auto Ads) saytda ko‘rsatish</strong>
          </label>

          <div>
            <button type="submit" className="ap-btn ap-btn--primary" disabled={savingAdsense}>
              {savingAdsense ? 'Saqlanmoqda…' : 'AdSense sozlamasini saqlash'}
            </button>
          </div>
        </form>
      </section>

      {/* 2. Ichki Homiy va Banner reklamalari */}
      <section className="ap-section">
        <div className="ap-section__head">
          <div>
            <h2>Homiylik va Hamkorlik bannerlari</h2>
            <p>O‘zingiz istagan kitob do‘konlari, o‘quv markazlari yoki homiylar bannerlarini joylashtiring</p>
          </div>
          <button
            type="button"
            className="ap-btn ap-btn--primary"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={15} /> Yangi reklama qo‘shish
          </button>
        </div>

        <div className="ap-stats-grid" style={{ marginBottom: 20 }}>
          <div className="ap-stat-card">
            <span>Jami ko‘rishlar</span>
            <strong>{displayNumber(totalViews)}</strong>
            <small>Foydalanuvchilar ko‘rgan marta</small>
          </div>
          <div className="ap-stat-card">
            <span>Jami bosishlar</span>
            <strong>{displayNumber(totalClicks)}</strong>
            <small>Havolaga o‘tilgan marta</small>
          </div>
          <div className="ap-stat-card">
            <span>O‘rtacha samaradorlik (CTR)</span>
            <strong style={{ color: '#566d65' }}>{averageCtr}%</strong>
            <small>Bosishlar foizi</small>
          </div>
        </div>

        {loading ? (
          <Skeleton rows={4} />
        ) : banners.length === 0 ? (
          <Empty
            icon={Megaphone}
            title="Hali reklamalar yo‘q"
            text="«Yangi reklama qo‘shish» tugmasini bosib birinchi homiylik bannerini joylashtiring."
          />
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Sarlavha va havola</th>
                  <th>Joylashuv</th>
                  <th>Ko‘rishlar</th>
                  <th>Bosishlar</th>
                  <th>CTR</th>
                  <th>Holat</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.title}</strong>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        <a href={b.linkUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                          {b.linkUrl.slice(0, 45)}…
                        </a>
                      </div>
                    </td>
                    <td>
                      <span className="ap-tag">
                        {b.placement === 'home_top' ? 'Bosh sahifa' : b.placement === 'book_detail' ? 'Kitob sahifasi' : 'Barcha sahifalar'}
                      </span>
                    </td>
                    <td>{displayNumber(b.viewsCount)}</td>
                    <td>{displayNumber(b.clicksCount)}</td>
                    <td><strong>{b.ctr}%</strong></td>
                    <td>
                      <button
                        type="button"
                        className={`ap-btn ap-btn--small ${b.isActive ? 'ap-btn--success' : ''}`}
                        onClick={() => handleToggleActive(b)}
                        style={{ minWidth: 70 }}
                      >
                        {b.isActive ? 'Faol' : 'To‘xtatilgan'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ap-btn ap-btn--small ap-btn--danger"
                        onClick={() => setDeleteTarget(b)}
                        title="O‘chirish"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Banner qo'shish modali */}
      {modalOpen && (
        <Modal title="Yangi reklama / homiylik banneri qo‘shish" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreateBanner} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="ap-label">
              <span>Sarlavha (Kompaniya yoki kitob nomi) *</span>
              <input
                type="text"
                maxLength={200}
                placeholder="Masalan: Asaxiy Books — Yangi kitoblar yarmarkasi"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="ap-input"
                required
              />
            </label>

            <label className="ap-label">
              <span>O‘tish havolasi (Sayt yoki Telegram kanal) *</span>
              <input
                type="url"
                placeholder="https://t.me/kanal yoki https://sayt.uz"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                className="ap-input"
                required
              />
            </label>

            <label className="ap-label">
              <span>Rasm / Banner havolasi (Image URL, ixtiyoriy)</span>
              <input
                type="url"
                placeholder="https://example.com/banner.png"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="ap-input"
              />
            </label>

            <label className="ap-label">
              <span>Joylashuvi</span>
              <select
                value={form.placement}
                onChange={(e) => setForm({ ...form, placement: e.target.value })}
                className="ap-select"
              >
                <option value="all">Barcha sahifalarda</option>
                <option value="home_top">Bosh sahifada</option>
                <option value="book_detail">Kitob tafsiloti sahifasida</option>
                <option value="reader_side">Mutolaa sahifasida</option>
              </select>
            </label>

            <div className="ap-actions-row" style={{ marginTop: 10 }}>
              <button type="button" className="ap-btn" onClick={() => setModalOpen(false)}>
                Bekor qilish
              </button>
              <button type="submit" className="ap-btn ap-btn--primary" disabled={creating}>
                {creating ? 'Qo‘shilmoqda…' : 'Bannerni saqlash'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* O'chirish tasdiqlash dialogi */}
      {deleteTarget && (
        <ConfirmDialog
          title="Reklamani o‘chirish"
          text={`Rostdan ham "${deleteTarget.title}" reklamasini o‘chirmoqchimisiz?`}
          confirmLabel="O‘chirish"
          danger
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
