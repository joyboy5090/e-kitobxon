import React from 'react'
import {
  BookOpen,
  Search,
  Bookmark,
  Heart,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Library,
  Feather,
  Compass
} from 'lucide-react'
import './about.css'

export default function AboutPage({ onNavigate }) {
  const goTo = (path) => {
    if (onNavigate) onNavigate(path)
  }

  return (
    <div className="ab-page fade-in">
      {/* 1. Hero qismi */}
      <header className="ab-hero">
        <div className="ab-eyebrow">
          <Feather size={15} /> Mutolaa — qalbning sayri
        </div>
        <h1>Kitobxonlar uchun yaratilgan sokin makon</h1>
        <p>
          Kitobxon — har bir kitobsevar inson o‘ziga yoqqan durdona asarlarni oson, tez va
          maroq bilan topib mutolaa qilishi uchun mo‘ljallangan zamonaviy onlayn kutubxona.
        </p>
      </header>

      {/* 2. Asosiy missiya kartasi */}
      <section className="ab-mission-card">
        <div className="ab-mission-copy">
          <h2>Bizning maqsadimiz nima?</h2>
          <p>
            Biz kitob o‘qish jarayonini har bir inson uchun iloji boricha oson va yoqimli qilishni
            maqsad qilganmiz. Bugungi shiddatli zamonda kerakli kitobni topish, uni o‘ziga qulay
            shaklda mutolaa qilish va to‘xtagan joyini yo‘qotmasdan davom ettirish juda muhim.
            Shu sababli, Kitobxon platformasida barcha imkoniyatlar aynan o‘quvchining erkin va
            qulay mutolaasi uchun birlashtirildi.
          </p>
        </div>
        <div className="ab-mission-badge">
          <BookOpen size={36} strokeWidth={1.5} />
          <strong>100% Bepul</strong>
          <span>Ommaviy ma’rifat uchun</span>
        </div>
      </section>

      {/* 3. Asosiy qulayliklar */}
      <section>
        <div className="ab-section-title">
          <h2>Nega aynan Kitobxon?</h2>
          <p>Mutolaangiz yanada maroqli bo‘lishi uchun yaratilgan qulayliklar</p>
        </div>

        <div className="ab-grid">
          <div className="ab-card">
            <div className="ab-card__icon">
              <Search size={22} />
            </div>
            <h3>Oson va tezkor qidiruv</h3>
            <p>
              O‘zingizga yoqqan kitobni nomi, muallifi yoki janri bo‘yicha bir zumda toping.
              Tarixiy asarlar, badiiy romanlar, mumtoz adabiyot — barchasi bir joyda.
            </p>
          </div>

          <div className="ab-card">
            <div className="ab-card__icon">
              <BookOpen size={22} />
            </div>
            <h3>Ikki xil o‘qish rejimi</h3>
            <p>
              Kitobni xohlasangiz qulay matn ko‘rinishida shriftlarni moslab o‘qing, xohlasangiz
              asl bosma kitobning sahifama-sahifa PDF ko‘rinishida mutolaa qiling.
            </p>
          </div>

          <div className="ab-card">
            <div className="ab-card__icon">
              <Bookmark size={22} />
            </div>
            <h3>Aqlli xatcho‘p va jarayon</h3>
            <p>
              Qaysi sahifada to‘xtaganingizni eslab qolish shart emas. Tizim siz o‘qiyotgan
              sahifani va o‘qish foizini avtomatik ravishda saqlab boradi.
            </p>
          </div>

          <div className="ab-card">
            <div className="ab-card__icon">
              <Heart size={22} />
            </div>
            <h3>Sevimlilar va shaxsiy javon</h3>
            <p>
              Yoqtirgan asarlaringizni yurakcha belgisi bilan "Sevimlilar"ga, keyinroq o‘qishni
              rejalashtirganlaringizni esa "O‘qish ro‘yxati"ga jamlang.
            </p>
          </div>

          <div className="ab-card">
            <div className="ab-card__icon">
              <MessageSquare size={22} />
            </div>
            <h3>Kitobxonlar sharhlari</h3>
            <p>
              O‘qigan kitoblaringizga 1 dan 5 gacha yulduzli baho bering va o‘z taassurotlaringizni
              yozib qoldiring. Boshqa o‘quvchilar fikri bilan tanishing.
            </p>
          </div>

          <div className="ab-card">
            <div className="ab-card__icon">
              <ShieldCheck size={22} />
            </div>
            <h3>Sokin va xavfsiz muhit</h3>
            <p>
              Chalg‘ituvchi ortiqcha reklamalarsiz, xavfsiz va tinch mutolaa muhiti. Sizning
              ma’lumotlaringiz zamonaviy shifrlash standartlari bilan himoyalangan.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Iqtibos */}
      <section className="ab-quote">
        <p>
          «Kitob — insoniyatning eng buyuk mo‘jizasi. U bizni zamonlar va makonlar osha
          donishmandlar suhbatiga yetaklaydi.»
        </p>
        <span>Har kuni o‘zingiz uchun bir sahifa</span>
      </section>

      {/* 5. CTA - Chorlov */}
      <section className="ab-cta">
        <h2>Siz qidirgan kitob shu yerda!</h2>
        <p>
          Kutubxonamizdagi sara asarlar bilan tanishing va hoziroq mutolaani boshlang.
        </p>
        <div className="ab-cta__actions">
          <button
            type="button"
            className="button-primary"
            onClick={() => goTo('/search')}
            style={{ gap: 8, padding: '12px 24px' }}
          >
            <Library size={16} /> Kitoblarni kashf etish <ArrowRight size={15} />
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => goTo('/support')}
            style={{ gap: 8, padding: '12px 24px' }}
          >
            Biz bilan bog‘lanish
          </button>
        </div>
      </section>
    </div>
  )
}
