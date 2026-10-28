import React, { useCallback, useEffect, useState } from 'react'
import { Download, HardDrive, Trash2 } from 'lucide-react'
import { ConfirmDialog, Empty, errorText, formatDateTime, Skeleton } from './AdminCommon.jsx'

export function BackupsSection({ api, notify }) {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadBackups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api('/api/admin/backups')
      setBackups(data.backups || [])
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setLoading(false)
    }
  }, [api, notify])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const data = await api('/api/admin/backups', { method: 'POST' })
      notify('success', `Zaxira muvaffaqiyatli yaratildi (${data.backup?.sizeFormatted || 'tayyor'})`)
      loadBackups()
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api(`/api/admin/backups/${encodeURIComponent(deleteTarget.filename)}`, { method: 'DELETE' })
      notify('success', 'Zaxira nusxasi o‘chirildi.')
      setDeleteTarget(null)
      loadBackups()
    } catch (err) {
      notify('error', errorText(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="ap-section">
      <div className="ap-section__head">
        <div>
          <h2>Ma’lumotlar bazasi zaxira nusxalari</h2>
          <p>Foydalanuvchilar, kitoblar, mutolaa jurnali va sharhlar to‘liq arxivlangan holatda saqlanadi</p>
        </div>
        <button
          type="button"
          className="ap-btn ap-btn--primary"
          onClick={handleCreateBackup}
          disabled={creating}
        >
          <HardDrive size={15} />
          {creating ? 'Zaxiralanmoqda…' : 'Hozir zaxira nusxa olish'}
        </button>
      </div>

      <div className="ap-stats-grid" style={{ marginBottom: 20 }}>
        <div className="ap-stat-card">
          <span>Mavjud zaxiralar</span>
          <strong>{backups.length} ta</strong>
          <small>Maksimal 15 ta nusxa saqlanadi</small>
        </div>
        <div className="ap-stat-card">
          <span>Oxirgi zaxira</span>
          <strong>{backups[0] ? formatDateTime(backups[0].createdAt) : 'Mavjud emas'}</strong>
          <small>{backups[0] ? backups[0].sizeFormatted : '—'}</small>
        </div>
        <div className="ap-stat-card">
          <span>Avtomatik rejim</span>
          <strong style={{ color: '#566d65' }}>Har 24 soatda faol</strong>
          <small>Server har kecha avtomatik zaxiralaydi</small>
        </div>
      </div>

      {loading ? (
        <Skeleton rows={4} />
      ) : backups.length === 0 ? (
        <Empty
          icon={HardDrive}
          title="Zaxira nusxalar hali yo‘q"
          text="Yuqoridagi tugmani bosib birinchi to‘liq zaxirani yarating."
        />
      ) : (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Fayl nomi</th>
                <th>Yaratilgan vaqti</th>
                <th>Hajmi</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.filename}>
                  <td>
                    <strong>{b.filename}</strong>
                  </td>
                  <td>{formatDateTime(b.createdAt)}</td>
                  <td><span className="ap-tag">{b.sizeFormatted}</span></td>
                  <td>
                    <div className="ap-row-actions">
                      <a
                        href={`/api/admin/backups/${encodeURIComponent(b.filename)}/download`}
                        download={b.filename}
                        className="ap-btn ap-btn--small"
                        title="Kompyuterga yuklab olish"
                      >
                        <Download size={13} /> Yuklab olish
                      </a>
                      <button
                        type="button"
                        className="ap-btn ap-btn--small ap-btn--danger"
                        onClick={() => setDeleteTarget(b)}
                        title="O‘chirish"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Zaxira nusxasini o‘chirish"
          text={`Rostdan ham "${deleteTarget.filename}" faylini butunlay o‘chirmoqchimisiz?`}
          confirmLabel="O‘chirish"
          danger
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  )
}
