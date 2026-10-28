// Kitobxon — Ma'lumotlar bazasi zaxira nusxa (Backup) tizimi
// PostgreSQL jadvallarini to'liq eksport qilish, siqish, saqlash va yuklab olish

import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { promisify } from 'node:util'

const gzip = promisify(zlib.gzip)
const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const BACKUP_DIR = path.join(projectRoot, 'backups')
const MAX_BACKUP_RETENTION = 15 // Saqlanadigan maksimal nusxalar soni

// Zaxiralanadigan asosiy jadvallar ro'yxati
const TABLES_TO_BACKUP = [
  'kitobxon_users',
  'library_books',
  'book_pages',
  'user_book_state',
  'book_reviews',
  'book_reading_events',
  'support_tickets',
  'support_replies',
  'faq_items',
  'admin_audit_log',
  'ad_banners',
  'site_settings',
]

export async function ensureBackupDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true })
}

export async function createDatabaseBackup(pool, adminUsername = 'system') {
  await ensureBackupDir()

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `kitobxon-backup-${timestamp}.json.gz`
  const filepath = path.join(BACKUP_DIR, filename)

  const backupData = {
    version: '1.0',
    app: 'e-kitobxon.uz',
    createdAt: new Date().toISOString(),
    createdBy: adminUsername,
    counts: {},
    tables: {},
  }

  // Har bir jadvaldan ma'lumotlarni xavfsiz o'qib olish
  for (const table of TABLES_TO_BACKUP) {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${table}`)
      backupData.counts[table] = rows.length
      backupData.tables[table] = rows
    } catch (err) {
      // Agar jadval hali mavjud bo'lmasa yoki xatolik bo'lsa
      backupData.counts[table] = 0
      backupData.tables[table] = []
    }
  }

  const jsonString = JSON.stringify(backupData)
  const compressedBuffer = await gzip(Buffer.from(jsonString, 'utf-8'))

  await fs.writeFile(filepath, compressedBuffer)
  const stat = await fs.stat(filepath)

  // Eski nusxalarni tozalash (Retention policy)
  await cleanOldBackups()

  return {
    filename,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    createdAt: backupData.createdAt,
    createdBy: adminUsername,
    counts: backupData.counts,
  }
}

export async function listBackups() {
  await ensureBackupDir()
  const entries = await fs.readdir(BACKUP_DIR)
  const backups = []

  for (const filename of entries) {
    if (!filename.startsWith('kitobxon-backup-') || !filename.endsWith('.json.gz')) continue
    const filepath = path.join(BACKUP_DIR, filename)
    try {
      const stat = await fs.stat(filepath)
      // Meta ma'lumotlarni o'qish (fayl nomidan va statdan)
      const datePart = filename.replace('kitobxon-backup-', '').replace('.json.gz', '')
      backups.push({
        filename,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
      })
    } catch {
      // Fayl o'qilmasa e'tiborsiz qoldiriladi
    }
  }

  // Eng yangi nusxalarni tepaga saralash
  backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return backups
}

export function getSafeBackupPath(filename) {
  // Path traversal himoyasi
  const safeName = path.basename(filename)
  if (!safeName.startsWith('kitobxon-backup-') || !safeName.endsWith('.json.gz')) {
    throw new Error('Noto‘g‘ri zaxira fayl nomi.')
  }
  const filepath = path.join(BACKUP_DIR, safeName)
  if (!fsSync.existsSync(filepath)) {
    throw new Error('Zaxira fayli topilmadi.')
  }
  return filepath
}

export async function deleteBackupFile(filename) {
  const filepath = getSafeBackupPath(filename)
  await fs.unlink(filepath)
  return true
}

async function cleanOldBackups() {
  try {
    const list = await listBackups()
    if (list.length > MAX_BACKUP_RETENTION) {
      const toDelete = list.slice(MAX_BACKUP_RETENTION)
      for (const item of toDelete) {
        await fs.unlink(path.join(BACKUP_DIR, item.filename)).catch(() => {})
      }
    }
  } catch (err) {
    console.error('Eski zaxiralarni tozalashda xatolik:', err.message)
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// Avtomatik zaxira taymerini ishga tushirish (har 24 soatda bir marta)
export function startAutoBackupScheduler(pool) {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

  // Server ishga tushgach tekshirish: bugun zaxira olinganmi?
  setTimeout(async () => {
    try {
      const backups = await listBackups()
      const now = Date.now()
      const latest = backups[0]
      const needsBackup = !latest || (now - new Date(latest.createdAt).getTime() > TWENTY_FOUR_HOURS)

      if (needsBackup) {
        console.log('🔄 Avtomatik dastlabki zaxira nusxa yaratilmoqda...')
        const res = await createDatabaseBackup(pool, 'auto-cron')
        console.log(`✅ Zaxira nusxa yaratildi: ${res.filename} (${res.sizeFormatted})`)
      }
    } catch (err) {
      console.error('Avtomatik zaxira olishda xatolik:', err.message)
    }
  }, 10000)

  // Har 24 soatda avtomatik chaqirish
  setInterval(async () => {
    try {
      console.log('⏰ Rejali kunlik zaxira nusxa yaratilmoqda...')
      const res = await createDatabaseBackup(pool, 'auto-cron')
      console.log(`✅ Kunlik zaxira muvaffaqiyatli saqlandi: ${res.filename}`)
    } catch (err) {
      console.error('Rejali zaxira olishda xatolik:', err.message)
    }
  }, TWENTY_FOUR_HOURS)
}
