import React, { useEffect, useState } from 'react'
import { Ban, CircleAlert, Search, ShieldCheck, Trash2, UserCheck, UsersRound } from 'lucide-react'
import { ConfirmDialog, displayNumber, Empty, errorText, formatDate, formatDateTime, Pager, Skeleton, useDebounced } from './AdminCommon.jsx'

export function UsersSection({ api, notify, currentUser }) {
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const debouncedQ = useDebounced(q)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (debouncedQ) params.set('q', debouncedQ)
    if (role) params.set('role', role)
    if (status) params.set('status', status)
    api(`/api/admin/users?${params.toString()}`)
      .then((result) => { if (!cancelled) { setData(result); setError('') } })
      .catch((loadError) => { if (!cancelled) setError(errorText(loadError)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [api, debouncedQ, role, status, page, reload])

  useEffect(() => {
    if (data && !data.users.length && page > 1) setPage(page - 1)
  }, [data, page])

  const run = async (user, request, successText) => {
    setBusy(true)
    try {
      await request()
      notify('success', successText)
      setConfirm(null)
      setReload((value) => value + 1)
    } catch (actionError) {
      notify('error', errorText(actionError))
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }
  const patchUser = (user, body) => api(`/api/admin/users/${user.id}`, { method: 'PATCH', body })

  const doConfirm = () => {
    const { kind, user } = confirm
    if (kind === 'block') return run(user, () => patchUser(user, { isBlocked: true }), `${user.username} bloklandi.`)
    if (kind === 'promote') return run(user, () => patchUser(user, { role: 'admin' }), `${user.username} admin qilindi.`)
    if (kind === 'demote') return run(user, () => patchUser(user, { role: 'user' }), `${user.username} oddiy foydalanuvchi bo‘ldi.`)
    return run(user, () => api(`/api/admin/users/${user.id}`, { method: 'DELETE', body: {} }), `${user.username} o‘chirildi.`)
  }
  const confirmCopy = {
    block: ['Foydalanuvchini bloklash', 'Bloklash', 'tizimdan chiqariladi va qayta kira olmaydi. Keyin blokdan chiqarishingiz mumkin.', true],
    promote: ['Admin qilish', 'Admin qilish', 'barcha admin huquqlariga ega bo‘ladi: kitoblar va foydalanuvchilarni boshqara oladi.', false],
    demote: ['Admin huquqini olish', 'Huquqni olish', 'endi oddiy foydalanuvchi bo‘ladi.', true],
    delete: ['Foydalanuvchini o‘chirish', 'Ha, o‘chirish', 'va uning barcha ma’lumotlari (sevimlilar, o‘qish tarixi, sharhlar) butunlay o‘chiriladi. Qaytarib bo‘lmaydi.', true],
  }

  const summary = data?.summary
  return (
    <div className="ap-stack">
      <div className="ap-chips">
        <span>Jami: <strong>{displayNumber(summary?.total)}</strong></span>
        <span>Adminlar: <strong>{displayNumber(summary?.admins)}</strong></span>
        <span>Bloklangan: <strong>{displayNumber(summary?.blocked)}</strong></span>
      </div>
      <div className="ap-toolbar">
        <label className="ap-search"><Search size={15} />
          <input type="search" value={q} onChange={(event) => { setQ(event.target.value); setPage(1) }} placeholder="Username yoki email bo‘yicha qidirish" aria-label="Foydalanuvchi qidirish" />
        </label>
        <select className="ap-select" value={role} onChange={(event) => { setRole(event.target.value); setPage(1) }} aria-label="Rol bo‘yicha filtr">
          <option value="">Barcha rollar</option><option value="user">Foydalanuvchi</option><option value="admin">Admin</option>
        </select>
        <select className="ap-select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} aria-label="Holat bo‘yicha filtr">
          <option value="">Barcha holatlar</option><option value="active">Faol</option><option value="blocked">Bloklangan</option>
        </select>
      </div>
      {error && <div className="ap-alert" role="alert"><CircleAlert size={16} /> {error}</div>}
      <section className="ap-card ap-card--flush">
        {loading && !data ? <div className="ap-pad"><Skeleton /></div>
          : data?.users.length ? (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Foydalanuvchi</th><th>Rol</th><th>Holat</th><th>Mutolaa</th><th>Ro‘yxatdan o‘tgan</th><th>Oxirgi kirish</th><th className="ap-th-actions">Amallar</th></tr></thead>
                <tbody>
                  {data.users.map((user) => {
                    const isSelf = user.id === currentUser?.id
                    const isAdmin = user.role === 'admin'
                    return (
                      <tr key={user.id} className={user.isBlocked ? 'is-blocked' : ''}>
                        <td><strong>{user.username}{isSelf ? ' (siz)' : ''}</strong><small>{user.email}</small></td>
                        <td><span className={`ap-badge ${isAdmin ? 'ap-badge--accent' : ''}`}>{isAdmin ? 'Admin' : 'Foydalanuvchi'}</span></td>
                        <td><span className={`ap-badge ${user.isBlocked ? 'ap-badge--danger' : 'ap-badge--ok'}`}>{user.isBlocked ? 'Bloklangan' : 'Faol'}</span></td>
                        <td>{displayNumber(user.pageReads)} sahifa<small>{displayNumber(user.completedBooks)} ta tugatgan</small></td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>{formatDateTime(user.lastLoginAt)}</td>
                        <td className="ap-td-actions">
                          {isSelf ? <small>—</small> : (<>
                            {user.isBlocked
                              ? <button type="button" className="ap-icon-btn" title="Blokdan chiqarish" aria-label={`${user.username} ni blokdan chiqarish`} disabled={busy}
                                  onClick={() => run(user, () => patchUser(user, { isBlocked: false }), `${user.username} blokdan chiqarildi.`)}><UserCheck size={15} /></button>
                              : !isAdmin && <button type="button" className="ap-icon-btn" title="Bloklash" aria-label={`${user.username} ni bloklash`} onClick={() => setConfirm({ kind: 'block', user })}><Ban size={15} /></button>}
                            {!user.isBlocked && (
                              <button type="button" className="ap-icon-btn" title={isAdmin ? 'Admin huquqini olish' : 'Admin qilish'} aria-label={isAdmin ? `${user.username} dan admin huquqini olish` : `${user.username} ni admin qilish`}
                                onClick={() => setConfirm({ kind: isAdmin ? 'demote' : 'promote', user })}><ShieldCheck size={15} /></button>
                            )}
                            {!isAdmin && <button type="button" className="ap-icon-btn ap-icon-btn--danger" title="O‘chirish" aria-label={`${user.username} ni o‘chirish`} onClick={() => setConfirm({ kind: 'delete', user })}><Trash2 size={15} /></button>}
                          </>)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty icon={UsersRound} title="Foydalanuvchi topilmadi" text="Qidiruv yoki filtrni o‘zgartirib ko‘ring." />}
      </section>
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}

      {confirm && (
        <ConfirmDialog danger={confirmCopy[confirm.kind][3]} busy={busy} title={confirmCopy[confirm.kind][0]} confirmLabel={confirmCopy[confirm.kind][1]}
          onCancel={() => setConfirm(null)} onConfirm={doConfirm}
          text={`“${confirm.user.username}” ${confirmCopy[confirm.kind][2]}`} />
      )}
    </div>
  )
}
