import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatDateTime } from '../src/components/common/dateUtils.js'

test('formatDate formats Date instances strictly to dd.mm.yyyy', () => {
  const d1 = new Date(2026, 9, 27) // month is 0-indexed, so 9 is October
  assert.equal(formatDate(d1), '27.10.2026')

  const d2 = new Date(2026, 0, 5) // 5 January 2026
  assert.equal(formatDate(d2), '05.01.2026')

  const d3 = new Date(2026, 11, 31) // 31 December 2026
  assert.equal(formatDate(d3), '31.12.2026')
})

test('formatDate handles empty or invalid values safely', () => {
  assert.equal(formatDate(null), '')
  assert.equal(formatDate(''), '')
  assert.equal(formatDate('invalid-date'), '')
})

test('formatDateTime formats date and time strictly to dd.mm.yyyy HH:MM', () => {
  const date = new Date(2026, 9, 27, 14, 30) // 27 Oct 2026 14:30
  assert.equal(formatDateTime(date), '27.10.2026 14:30')
})
