import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('robots.txt allows all pages and points to sitemap.xml', () => {
  const content = fs.readFileSync(path.resolve('public/robots.txt'), 'utf8')
  assert.ok(content.includes('User-agent: *'), 'Barcha qidiruv botlari ko‘rsatilgan bo‘lishi kerak')
  assert.ok(content.includes('Disallow:\n') || content.includes('Disallow:\r\n'), 'Disallow bo‘sh qoldirilgan bo‘lishi kerak')
  assert.ok(content.includes('Sitemap: https://e-kitobxon.uz/sitemap.xml'), 'Sitemap ko‘rsatilgan bo‘lishi kerak')
})

test('ads.txt contains valid AdSense publisher ID', () => {
  const content = fs.readFileSync(path.resolve('public/ads.txt'), 'utf8')
  assert.ok(content.includes('google.com'), 'google.com domini bo‘lishi kerak')
  assert.ok(content.includes('pub-1115153746763009'), 'Publisher ID bo‘lishi kerak')
  assert.ok(content.includes('DIRECT'), 'DIRECT ko‘rsatilishi kerak')
})
