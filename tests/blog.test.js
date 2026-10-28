import test from 'node:test'
import assert from 'node:assert/strict'

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/['’`ʼʻ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 180)
}

test('slugify generates valid URL-friendly slugs for Uzbek text', () => {
  assert.equal(
    slugify('Abdulla Qodiriy va o‘zbek romanchiligi'),
    'abdulla-qodiriy-va-ozbek-romanchiligi'
  )
  assert.equal(
    slugify('Cho‘lponning "Kecha va kunduz" romani!'),
    'cholponning-kecha-va-kunduz-romani'
  )
  assert.equal(
    slugify('Kitob o‘qishning 7 ta ilmiy foydasi'),
    'kitob-oqishning-7-ta-ilmiy-foydasi'
  )
})

test('slugify handles special characters and trims properly', () => {
  assert.equal(slugify('   Mavzu --- 2026   '), 'mavzu-2026')
  assert.equal(slugify('O‘zbekiston & Jahon Adabiyoti'), 'ozbekiston-jahon-adabiyoti')
})
