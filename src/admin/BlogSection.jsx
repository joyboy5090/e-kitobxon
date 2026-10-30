import React, { useEffect, useState } from 'react'
import {
  Check, CircleAlert, Clock, Edit3, Eye, FileText, Globe,
  Newspaper, Plus, RefreshCw, Trash2, X
} from 'lucide-react'
import { ConfirmDialog, formatDate, Modal, Skeleton } from './AdminCommon.jsx'

const CATEGORIES = [
  'Adabiyot tarixi',
  'Taqriz',
  'Mutolaa sirlari',
  'Yozuvchilar hayoti',
  'Jahon adabiyoti',
  'Kitobxonlik yangiliklari',
]

export function BlogSection({ api, notify }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPost, setEditingPost] = useState(null)
  const [deletingPost, setDeletingPost] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadPosts = async () => {
    setLoading(true)
    try {
      const data = await api('/api/admin/blog')
      setPosts(data || [])
    } catch (err) {
      notify('error', err.message || 'Maqolalarni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [])

  const startCreate = () => {
    setEditingPost({
      id: null,
      title: '',
      slug: '',
      category: 'Adabiyot tarixi',
      author_name: 'Kitobxon tahririyati',
      reading_time: 4,
      excerpt: '',
      content: '',
      cover_image: '',
      is_published: true,
    })
  }

  const startEdit = (post) => {
    setEditingPost({ ...post })
  }

  const savePost = async (e) => {
    e.preventDefault()
    if (!editingPost.title.trim()) {
      notify('error', 'Sarlavha kiritilishi shart')
      return
    }
    if (!editingPost.content.trim()) {
      notify('error', 'Maqola matni kiritilishi shart')
      return
    }

    setSaving(true)
    try {
      if (editingPost.id) {
        await api(`/api/admin/blog/${editingPost.id}`, {
          method: 'PUT',
          body: editingPost,
        })
        notify('success', 'Maqola muvaffaqiyatli yangilandi')
      } else {
        await api('/api/admin/blog', {
          method: 'POST',
          body: editingPost,
        })
        notify('success', 'Yangi maqola yaratildi')
      }
      setEditingPost(null)
      loadPosts()
    } catch (err) {
      notify('error', err.message || 'Saqlashda xatolik yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingPost) return
    setDeleting(true)
    try {
      await api(`/api/admin/blog/${deletingPost.id}`, { method: 'DELETE' })
      notify('success', 'Maqola o‘chirildi')
      setDeletingPost(null)
      loadPosts()
    } catch (err) {
      notify('error', err.message || 'O‘chirishda xatolik yuz berdi')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="ap-section">
      <div className="ap-bar">
        <div>
          <h2>Adabiy Maqolalar va Taqrizlar</h2>
          <p className="ap-hint">Saytdagi blog postlari, adabiy taqrizlar va yangiliklarni boshqarish</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="ap-btn ap-btn--subtle" onClick={loadPosts} disabled={loading} title="Yangilash">
            <RefreshCw size={14} className={loading ? 'spin-slow' : ''} /> Yangilash
          </button>
          <button type="button" className="ap-btn ap-btn--primary" onClick={startCreate}>
            <Plus size={15} /> Yangi maqola yozish
          </button>
        </div>
      </div>

      <div className="ap-card">
        {loading ? (
          <Skeleton rows={4} />
        ) : posts.length === 0 ? (
          <div className="ap-empty">
            <Newspaper size={36} />
            <p>Hozircha maqolalar mavjud emas</p>
            <button type="button" className="ap-btn ap-btn--primary" onClick={startCreate}>
              Birinchi maqolani yozish
            </button>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Sarlavha</th>
                  <th>Rukn</th>
                  <th>Muallif</th>
                  <th>Mutolaa</th>
                  <th>Ko‘rishlar</th>
                  <th>Holati</th>
                  <th>Sana</th>
                  <th style={{ textAlign: 'right' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <strong>{post.title}</strong>
                      <div className="ap-subtle" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                        /blog/{post.slug}
                      </div>
                    </td>
                    <td>
                      <span className="ap-badge">{post.category}</span>
                    </td>
                    <td>{post.author_name}</td>
                    <td>{post.reading_time} daq</td>
                    <td>
                      <Eye size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {post.views_count}
                    </td>
                    <td>
                      {post.is_published ? (
                        <span className="ap-badge ap-badge--success">Chop etilgan</span>
                      ) : (
                        <span className="ap-badge ap-badge--warning">Qoralama</span>
                      )}
                    </td>
                    <td className="ap-subtle">
                      {formatDate(post.created_at)}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ap-btn ap-btn--subtle ap-btn--sm"
                        style={{ marginRight: 6 }}
                        title="Saytda ko‘rish"
                      >
                        <Globe size={13} />
                      </a>
                      <button
                        type="button"
                        className="ap-btn ap-btn--subtle ap-btn--sm"
                        onClick={() => startEdit(post)}
                        style={{ marginRight: 6 }}
                        title="Tahrirlash"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        className="ap-btn ap-btn--danger ap-btn--sm"
                        onClick={() => setDeletingPost(post)}
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
      </div>

      {/* Tahrirlash / Yaratish Modali */}
      {editingPost && (
        <Modal
          title={editingPost.id ? 'Maqolani tahrirlash' : 'Yangi adabiy maqola yozish'}
          onClose={() => setEditingPost(null)}
          width="740px"
        >
          <form onSubmit={savePost}>
            <div className="ap-form-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
              <div className="ap-form-field">
                <label>Maqola sarlavhasi *</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Abdulla Qodiriy va o‘zbek romanchiligi"
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                />
              </div>

              <div className="ap-form-field">
                <label>Rukn (Kategoriya)</label>
                <select
                  value={editingPost.category}
                  onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ap-form-grid" style={{ gridTemplateColumns: '1.5fr 1fr 1fr' }}>
              <div className="ap-form-field">
                <label>URL Slug (havola qismi)</label>
                <input
                  type="text"
                  placeholder="avtomatik-yaratiladi"
                  value={editingPost.slug || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                />
              </div>

              <div className="ap-form-field">
                <label>Muallif</label>
                <input
                  type="text"
                  value={editingPost.author_name}
                  onChange={(e) => setEditingPost({ ...editingPost, author_name: e.target.value })}
                />
              </div>

              <div className="ap-form-field">
                <label>Mutolaa vaqti (daq.)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={editingPost.reading_time}
                  onChange={(e) => setEditingPost({ ...editingPost, reading_time: e.target.value })}
                />
              </div>
            </div>

            <div className="ap-form-field">
              <label>Qisqacha tavsif (Excerpt / Anotatsiya)</label>
              <textarea
                rows="2"
                placeholder="Kartochka va qidiruv tizimlarida ko‘rinadigan 1-2 jumlalik qisqacha mazmun..."
                value={editingPost.excerpt}
                onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
              />
            </div>

            <div className="ap-form-field">
              <label>Maqola to‘liq matni * (Sarlavhalar uchun ##, iqtiboslar uchun &gt; ishlatishingiz mumkin)</label>
              <textarea
                rows="10"
                required
                style={{ fontFamily: 'inherit', lineHeight: 1.5 }}
                placeholder="Maqola matnini shu yerga yozing..."
                value={editingPost.content}
                onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
              />
            </div>

            <div className="ap-form-field" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={editingPost.is_published}
                  onChange={(e) => setEditingPost({ ...editingPost, is_published: e.target.checked })}
                />
                <strong>Saytda darhol chop etish (Faol)</strong>
              </label>
            </div>

            <div className="ap-modal__actions" style={{ marginTop: 24 }}>
              <button type="button" className="ap-btn ap-btn--subtle" onClick={() => setEditingPost(null)}>
                Bekor qilish
              </button>
              <button type="submit" className="ap-btn ap-btn--primary" disabled={saving}>
                {saving ? 'Saqlanmoqda...' : editingPost.id ? 'O‘zgarishlarni saqlash' : 'Chop etish'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* O'chirishni tasdiqlash */}
      {deletingPost && (
        <ConfirmDialog
          title="Maqolani o‘chirish"
          text={`Haqiqatan ham "${deletingPost.title}" maqolasini o‘chirmoqchimisiz? Ushbu amalni bekor qilib bo‘lmaydi.`}
          confirmLabel={deleting ? 'O‘chirilmoqda...' : 'O‘chirish'}
          danger
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingPost(null)}
        />
      )}
    </div>
  )
}
