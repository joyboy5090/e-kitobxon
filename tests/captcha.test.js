import test from 'node:test'
import assert from 'node:assert/strict'
import { generateCaptcha, verifyCaptcha } from '../server/captcha.js'

test('generateCaptcha creates valid SVG and numeric answer', () => {
  const { svg, answer, expiresAt } = generateCaptcha()
  assert.ok(svg.startsWith('<svg'), 'SVG tag bilan boshlanishi kerak')
  assert.ok(svg.includes('</svg>'), 'SVG tag bilan tugashi kerak')
  assert.ok(Number.isInteger(Number(answer)), 'Javob butun son bo‘lishi kerak')
  assert.ok(expiresAt > Date.now(), 'Amal qilish muddati kelajakda bo‘lishi kerak')
})

test('verifyCaptcha validates correct answer and rejects wrong answer', () => {
  const reqSuccess = {
    session: {
      captchaAnswer: '42',
      captchaExpires: Date.now() + 60000,
    },
  }
  assert.equal(verifyCaptcha(reqSuccess, '42'), true, 'To‘g‘ri javob qabul qilinishi kerak')
  assert.equal(reqSuccess.session.captchaAnswer, undefined, 'Ishlatilgan javob darhol o‘chirilishi kerak (bir martalik)')

  const reqFail = {
    session: {
      captchaAnswer: '15',
      captchaExpires: Date.now() + 60000,
    },
  }
  assert.equal(verifyCaptcha(reqFail, '99'), false, 'Noto‘g‘ri javob rad etilishi kerak')

  const reqExpired = {
    session: {
      captchaAnswer: '10',
      captchaExpires: Date.now() - 5000,
    },
  }
  assert.equal(verifyCaptcha(reqExpired, '10'), false, 'Eskirgan captcha rad etilishi kerak')
})
