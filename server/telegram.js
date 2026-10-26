// Telegram bildirishnoma xizmati
// Saytda yangi murojaat, foydalanuvchi yoki sharh paydo bo'lganda adminga xabar yuboradi.

const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
const chatId = process.env.TELEGRAM_CHAT_ID?.trim()

/**
 * Telegram bot orqali xabar yuborish
 * @param {string} text HTML formatidagi xabar matni
 */
export async function sendTelegramMessage(text) {
  if (!botToken || !chatId) {
    // Agar bot sozlanmagan bo'lsa, xatolik bermaymiz
    return { ok: false, reason: 'not_configured' }
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.ok) {
      console.warn('Telegram xabarini yuborib bo‘lmadi:', data?.description || response.statusText)
      return { ok: false, error: data?.description }
    }

    return { ok: true }
  } catch (error) {
    console.warn('Telegram API bilan bog‘lanishda xatolik:', error.message)
    return { ok: false, error: error.message }
  }
}

/**
 * Yangi shikoyat yoki taklif kelganda xabar berish
 */
export async function notifyNewTicket({ username, type, subject, message }) {
  const typeIcon = type === 'complaint' ? '⚠️ <b>SHIKOYAT</b>' : '💡 <b>TAKLIF</b>'
  const text = [
    `📩 <b>Kitobxon: Yangi murojaat!</b>`,
    ``,
    `Turi: ${typeIcon}`,
    `Foydalanuvchi: <b>${escapeHtml(username)}</b>`,
    `Mavzu: <b>${escapeHtml(subject)}</b>`,
    ``,
    `Xabar:`,
    `<i>${escapeHtml(message.slice(0, 800))}${message.length > 800 ? '...' : ''}</i>`,
    ``,
    `🔗 <a href="https://e-kitobxon.uz/admin#support">Admin panelda ko‘rish va javob yozish</a>`,
  ].join('\n')

  return sendTelegramMessage(text)
}

/**
 * Yangi foydalanuvchi ro'yxatdan o'tganda xabar berish
 */
export async function notifyNewUser({ username, email }) {
  const text = [
    `👤 <b>Kitobxon: Yangi o‘quvchi ro‘yxatdan o‘tdi!</b>`,
    ``,
    `Foydalanuvchi: <b>${escapeHtml(username)}</b>`,
    `Email: <code>${escapeHtml(email)}</code>`,
    `Vaqt: ${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`,
  ].join('\n')

  return sendTelegramMessage(text)
}

/**
 * Yangi sharh qoldirilganda xabar berish
 */
export async function notifyNewReview({ bookTitle, username, rating, comment }) {
  const stars = '⭐'.repeat(Math.max(1, Math.min(5, Number(rating) || 5)))
  const text = [
    `⭐ <b>Kitobxon: Yangi kitob sharhi!</b>`,
    ``,
    `Kitob: <b>«${escapeHtml(bookTitle)}»</b>`,
    `O‘quvchi: <b>${escapeHtml(username)}</b>`,
    `Baho: ${stars} (${rating}/5)`,
    ``,
    `Fikr:`,
    `<i>${escapeHtml(comment.slice(0, 500))}${comment.length > 500 ? '...' : ''}</i>`,
  ].join('\n')

  return sendTelegramMessage(text)
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
