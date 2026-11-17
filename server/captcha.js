// Kitobxon — Spamdan va botlardan himoya (CAPTCHA tizimi)
// Zero-dependency SVG asosidagi dinamik matematik captcha

export function generateCaptcha() {
  const isAdd = Math.random() > 0.4
  let a, b, answer, question

  if (isAdd) {
    a = Math.floor(Math.random() * 12) + 2 // 2..13
    b = Math.floor(Math.random() * 9) + 1  // 1..9
    answer = a + b
    question = `${a} + ${b} = ?`
  } else {
    a = Math.floor(Math.random() * 10) + 10 // 10..19
    b = Math.floor(Math.random() * 8) + 1   // 1..8
    answer = a - b
    question = `${a} - ${b} = ?`
  }

  const width = 150
  const height = 42

  // Noaniqlik uchun fon chiziqlari (shovqin)
  let noise = ''
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * width)
    const y1 = Math.floor(Math.random() * height)
    const x2 = Math.floor(Math.random() * width)
    const y2 = Math.floor(Math.random() * height)
    noise += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c39b76" stroke-width="1.2" opacity="0.35" />`
  }

  // Tasodifiy nuqtalar
  for (let i = 0; i < 8; i++) {
    const cx = Math.floor(Math.random() * width)
    const cy = Math.floor(Math.random() * height)
    noise += `<circle cx="${cx}" cy="${cy}" r="1.5" fill="#855852" opacity="0.3" />`
  }

  // Misol belgilarini alohida text elementlarida tasodifiy siljishlar bilan generatsiya qilish (OCR va regex scrapingdan himoya)
  const chars = question.split('')
  const totalChars = chars.length
  const step = (width - 32) / Math.max(1, totalChars)
  const startX = 16
  const charElements = chars.map((char, index) => {
    const x = Math.round(startX + index * step + (Math.random() * 4 - 2))
    const y = Math.round(26 + (Math.random() * 6 - 3))
    const rot = Math.round(Math.random() * 16 - 8)
    const fontSize = Math.floor(Math.random() * 3) + 17
    return `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="${fontSize}" fill="#3e2d21">${char}</text>`
  }).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="border-radius:8px;background:#f5efe6;border:1px solid #dfd6c8;display:inline-block;vertical-align:middle;user-select:none;">
    ${noise}
    ${charElements}
  </svg>`

  return {
    svg,
    answer: String(answer),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 daqiqa
  }
}

export function verifyCaptcha(req, userAnswer) {
  if (!req.session) return false
  const expected = req.session.captchaAnswer
  const expires = req.session.captchaExpires

  // Bir marta tekshirilgach darhol o'chiriladi (replay attack va time-trap aylanib o'tishining oldini olish)
  delete req.session.captchaAnswer
  delete req.session.captchaExpires
  delete req.session.captchaGeneratedAt

  if (!expected || !expires) return false
  if (Date.now() > expires) return false
  if (typeof userAnswer !== 'string' && typeof userAnswer !== 'number') return false

  return String(userAnswer).trim() === String(expected).trim()
}
