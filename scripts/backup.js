// Kitobxon — Standalone CLI Backup Script
// Foydalanish: node scripts/backup.js yoki npm run backup

import pg from 'pg'
import { createDatabaseBackup } from '../server/backup.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('❌ Xatolik: DATABASE_URL muhit o‘zgaruvchisi topilmadi.')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: databaseUrl })

async function run() {
  console.log('📦 Kitobxon ma‘lumotlar bazasi zaxira nusxasi olinmoqda...')
  const start = Date.now()
  try {
    const backup = await createDatabaseBackup(pool, 'cli')
    const elapsed = ((Date.now() - start) / 1000).toFixed(2)
    console.log(`\n✅ Muvaffaqiyatli yakunlandi (${elapsed}s)!`)
    console.log(`📁 Fayl: backups/${backup.filename}`)
    console.log(`📊 Hajmi: ${backup.sizeFormatted}`)
    console.log('\nJadvallar statistikasi:')
    for (const [table, count] of Object.entries(backup.counts)) {
      console.log(`  - ${table.padEnd(22)}: ${count} ta yozuv`)
    }
  } catch (error) {
    console.error('❌ Zaxira olishda xatolik:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

run()
