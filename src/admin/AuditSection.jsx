import React, { useEffect, useState } from 'react'
import { CircleAlert, ScrollText } from 'lucide-react'
import { Empty, errorText, formatDateTime, Pager, Skeleton } from './AdminCommon.jsx'

const ACTION_LABELS = {
  'book.create': 'Kitob qo‘shildi',
  'book.update': 'Kitob tahrirlandi',
  'book.delete': 'Kitob o‘chirildi',
  'user.block': 'Foydalanuvchi bloklandi',
  'user.unblock': 'Blokdan chiqarildi',
  'user.role': 'Rol o‘zgartirildi',
  'user.delete': 'Foydalanuvchi o‘chirildi',
  'ad.create': 'Reklama banneri qo‘shildi',
  'ad.update': 'Reklama tahrirlandi',
  'ad.delete': 'Reklama o‘chirildi',
  'adsense.update': 'AdSense sozlamalari yangilandi',
  'backup.create': 'Zaxira nusxasi yaratildi',
  'backup.delete': 'Zaxira nusxasi o‘chirildi',
}

export function AuditSection({ api }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api(`/api/admin/audit?page=${page}`)
      .then((result) => { if (!cancelled) { setData(result); setError('') } })
      .catch((loadError) => { if (!cancelled) setError(errorText(loadError)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [api, page])

  return (
    <div className="ap-stack">
      {error && <div className="ap-alert" role="alert"><CircleAlert size={16} /> {error}</div>}
      <section className="ap-card ap-card--flush">
        {loading && !data ? <div className="ap-pad"><Skeleton /></div>
          : data?.entries.length ? (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Vaqt</th><th>Admin</th><th>Amal</th><th>Tafsilot</th></tr></thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDateTime(entry.createdAt)}</td>
                      <td><strong>{entry.admin}</strong></td>
                      <td><span className="ap-badge">{ACTION_LABELS[entry.action] || entry.action}</span></td>
                      <td>{entry.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty icon={ScrollText} title="Jurnal hozircha bo‘sh" text="Kitob va foydalanuvchilar ustidagi amallar shu yerda qayd etiladi." />}
      </section>
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </div>
  )
}
