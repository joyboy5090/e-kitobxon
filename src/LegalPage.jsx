import React, { useState, useEffect } from 'react'
import { ShieldCheck, FileText, Scale, BookOpen, AlertCircle, ArrowLeft } from 'lucide-react'
import './legal.css'

export default function LegalPage({ initialTab = 'privacy', onNavigate }) {
  const [tab, setTab] = useState(initialTab) // 'privacy' | 'terms'

  useEffect(() => {
    setTab(initialTab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [initialTab])

  const switchTab = (newTab) => {
    setTab(newTab)
    if (onNavigate) {
      onNavigate(`/${newTab}`)
    }
  }

  return (
    <div className="lp-page fade-in">
      <header className="lp-header">
        <div className="lp-eyebrow">
          <Scale size={15} /> Huquqiy ma’lumotlar
        </div>
        <h1>{tab === 'privacy' ? 'Maxfiylik siyosati' : 'Foydalanish shartlari'}</h1>
        <p>Kitobxon platformasidan xavfsiz va qonuniy foydalanish qoidalari</p>
      </header>

      <nav className="lp-tabs" role="tablist" aria-label="Huquqiy bo‘limlar">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'privacy'}
          className={`lp-tab-btn ${tab === 'privacy' ? 'is-active' : ''}`}
          onClick={() => switchTab('privacy')}
        >
          <ShieldCheck size={16} />
          Maxfiylik siyosati
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'terms'}
          className={`lp-tab-btn ${tab === 'terms' ? 'is-active' : ''}`}
          onClick={() => switchTab('terms')}
        >
          <FileText size={16} />
          Foydalanish shartlari
        </button>
      </nav>

      <article className="lp-paper">
        {tab === 'privacy' ? <PrivacyContent /> : <TermsContent />}
      </article>
    </div>
  )
}

function PrivacyContent() {
  return (
    <>
      <span className="lp-date">Oxirgi yangilanish: 2026-yil 26-oktabr</span>

      <div className="lp-notice-box">
        <strong>Xulosa:</strong> Biz sizning shaxsiy daxlsizligingizni qadrlaymiz. Parollaringiz zamonaviy
        kriptografik usulda shifrlangan holda saqlanadi, shaxsiy ma’lumotlaringiz hech qachon uchinchi
        shaxslarga sotilmaydi yoki tijoriy maqsadlarda uzatilmaydi.
      </div>

      <h2>1. Qanday ma’lumotlarni yig‘amiz?</h2>
      <p>Kitobxon platformasida xizmat sifatini oshirish va shaxsiy mutolaa muhitini ta’minlash maqsadida quyidagi ma’lumotlar yig‘iladi:</p>
      <ul>
        <li><strong>Hisob ma’lumotlari:</strong> Foydalanuvchi nomi (username), faol Gmail pochta manzili va hisob paroli.</li>
        <li><strong>Kriptografik himoya:</strong> Barcha parollar qaytarib bo‘lmas zamonaviy <code>scrypt</code> xeshlash algoritmi yordamida shifrlanadi. Tizim ma’murlari ham sizning asl parolingizni ko‘ra olmaydi.</li>
        <li><strong>Demografik ma’lumotlar:</strong> Ro‘yxatdan o‘tishda ko‘rsatilgan jins ma’lumoti faqat umumiy yig‘ma statistikada aks etadi va boshqa foydalanuvchilarga ko‘rinmaydi.</li>
        <li><strong>Mutolaa faoliyati:</strong> Sevimli kitoblar ro‘yxati, xatcho‘plar, o‘qilgan sahifalar soni va qoldirilgan kitob sharhlari.</li>
      </ul>

      <h2>2. Ma’lumotlardan qanday maqsadda foydalanamiz?</h2>
      <p>Yig‘ilgan ma’lumotlar faqat quyidagi maqsadlarda ishlatiladi:</p>
      <ul>
        <li>Foydalanuvchini platformada autentifikatsiya qilish va uning shaxsiy sessiyasini yuritish;</li>
        <li>Kitob mutolaasi jarayonini (qaysi sahifada qolganlik va foiz ko‘rsatkichini) saqlab borish;</li>
        <li>Kitoblar bo‘yicha shaxsiy sharh va yulduzli baholarni tizimda aks ettirish;</li>
        <li>Qo‘llab-quvvatlash xizmati orqali yuborilgan taklif va shikoyatlarni ko‘rib chiqish hamda foydalanuvchiga javob qaytarish;</li>
        <li>Kutubxonadagi kitoblar o‘qilishining umumiy statistik tahlilini yuritish.</li>
      </ul>

      <h2>3. Cookie va sessiyalar</h2>
      <p>
        Platforma tizimga kirish holatini saqlash uchun xavfsiz <code>HTTP-only</code> cookie fayllaridan foydalanadi.
        Sessiyalar ma’lumotlar bazasida 7 kun davomida saqlanadi va foydalanuvchi tizimdan chiqqanida (Logout) yoki hisob
        bloklanganda avtomatik ravishda butunlay o‘chiriladi.
      </p>

      <h2>4. Ma’lumotlar xavfsizligi</h2>
      <p>
        Platformada CSRF (saytlararo so‘rovlarni soxtalashtirish) hujumlaridan himoya qilish uchun maxsus tokenlar tizimi,
        takroriy shubhali urinishlarga qarshi so‘rovlar sonini cheklovchi (Rate Limiting) mexanizmlar hamda xavfsiz HTTP headerlar
        (Helmet) o‘rnatilgan.
      </p>

      <h2>5. Foydalanuvchining huquqlari</h2>
      <p>
        Har bir foydalanuvchi o‘z shaxsiy ma’lumotlarini ko‘rish, qoldirgan sharhlarini yangilash, o‘qish ro‘yxatlarini tozalash
        hamda hisobini o‘chirishni so‘rab <a href="/support" className="lp-contact-link">Qo‘llab-quvvatlash sahifasi</a> yoki
        to‘g‘ridan-to‘g‘ri <a href="mailto:quvondiq5090@gmail.com" className="lp-contact-link">quvondiq5090@gmail.com</a> elektron pochtasi / Telegram (<a href="https://t.me/quvondiq0903" target="_blank" rel="noreferrer" className="lp-contact-link">@quvondiq0903</a>) orqali
        ma’muriyatga murojaat qilish huquqiga ega.
      </p>
    </>
  )
}

function TermsContent() {
  return (
    <>
      <span className="lp-date">Oxirgi yangilanish: 2026-yil 26-oktabr</span>

      <div className="lp-notice-box">
        <strong>Muhim bildirishnoma:</strong> Kitobxon — notijorat, ma’rifiy-elektron kutubxona loyihasi hisoblanadi.
        Saytdagi asarlar faqat shaxsiy mutolaa, ta’lim va tanishuv maqsadida taqdim etiladi.
      </div>

      <h2>1. Umumiy qoidalar</h2>
      <p>
        Kitobxon veb-saytidan foydalanish orqali siz ushbu Foydalanish shartlariga to‘liq rozilik bildirasiz. Agar siz ushbu
        shartlarning biror bandiga rozi bo‘lmasangiz, saytdan foydalanmasligingiz lozim.
      </p>

      <h2>2. Mualliflik huquqi va intellektual mulk (DMCA / Mualliflar uchun)</h2>
      <p>
        Biz mualliflik huquqlarini hurmat qilamiz. Agar siz platformada joylashtirilgan biror asarning qonuniy muallifi yoki
        mutlaq huquq egasi bo‘lsangiz va ushbu asarning kutubxonada turishiga e’tirozingiz bo‘lsa:
      </p>
      <ul>
        <li>
          Siz to‘g‘ridan-to‘g‘ri <a href="/support" className="lp-contact-link">Qo‘llab-quvvatlash xizmati</a>, rasmiy <a href="mailto:quvondiq5090@gmail.com" className="lp-contact-link">quvondiq5090@gmail.com</a> pochtasi yoki Telegram: <a href="https://t.me/quvondiq0903" target="_blank" rel="noreferrer" className="lp-contact-link">@quvondiq0903</a> orqali o‘z e’tirozingizni
          va asarga bo‘lgan mualliflik huquqingizni tasdiqlovchi ma’lumotlarni yuborishingiz mumkin.
        </li>
        <li>
          Ma’muriyat qonuniy huquq egasining murojaatini zudlik bilan (24 soat ichida) ko‘rib chiqadi va asarni kutubxona bazasidan
          to‘liq va qaytarib bo‘lmas tarzda olib tashlashni kafolatlaydi.
        </li>
      </ul>

      <h2>3. Foydalanuvchining majburiyatlari</h2>
      <p>Platformadan foydalanishda quyidagilar qat’iyan man etiladi:</p>
      <ul>
        <li>Kitoblar ostidagi sharhlar bo‘limida haqoratli, behayo, adovat qo‘zg‘atuvchi so‘zlarni ishlatish yoki spam yozish;</li>
        <li>Tizimning barqaror ishlashini buzishga qaratilgan har qanday avtomatlashtirilgan dasturlar (botlar, DDoS, skreyping)dan foydalanish;</li>
        <li>Boshqa shaxslarning nomidan soxta hisoblar ochish yoki birovning hisobiga ruxsatsiz kirishga urinish;</li>
        <li>Saytdagi himoyalangan PDF hujjatlarni noqonuniy o‘g‘irlash yoki tijorat maqsadida qayta sotish.</li>
      </ul>

      <h2>4. Ma’muriyatning huquqlari</h2>
      <p>
        Ma’muriyat qoidalarni buzgan foydalanuvchilarni ogohlantirishsiz bloklash, ularning sharhlarini o‘chirish hamda
        kutubxona resurslariga kirish huquqini cheklash huquqini o‘zida saqlab qoladi.
      </p>

      <h2>5. Javobgarlikning cheklanishi</h2>
      <p>
        Platforma xizmatlari «qanday bo‘lsa shunday» (as-is) asosida taqdim etiladi. Ma’muriyat texnik profilaktika yoki server
        yangilanishlari tufayli xizmat ko‘rsatishda yuzaga kelishi mumkin bo‘lgan vaqtinchalik uzilishlar uchun moddiy javobgarlikni o‘z
        zimmasiga olmaydi.
      </p>

      <h2>6. Shartlarning o‘zgarishi</h2>
      <p>
        Ushbu shartlar istalgan vaqtda ma’muriyat tomonidan qayta ko‘rib chiqilishi mumkin. Yangilangan shartlar sahifada e’lon
        qilingan paytdan boshlab darhol kuchga kiradi.
      </p>
    </>
  )
}
