import React, { useEffect, useState } from 'react'
import { BookOpen, CircleAlert, LockKeyhole, RefreshCw, UsersRound } from 'lucide-react'
import { displayNumber, errorText, Skeleton } from './AdminCommon.jsx'

function StatCard({ label, value }) {
  return <div className="ap-stat"><span>{label}</span><strong>{displayNumber(value)}</strong></div>
}

function DailyChart({ days, metric }) {
  const values = days.map((day) => day[metric] || 0)
  const max = Math.max(...values, 0)
  const total = values.reduce((sum, value) => sum + value, 0)
  return (
    <div>
      <div className="ap-chart" role="img" aria-label={`Kunlik grafik, jami ${total}`}>
        {days.map((day, index) => {
          const value = values[index]
          const height = max ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0
          const dayNumber = Number(day.date.slice(8))
          return (
            <div className="ap-chart__col" key={day.date} title={`${day.date}: ${displayNumber(value)}`}>
              <span className="ap-chart__bar" style={{ height: `${height}%` }} />
              <span className="ap-chart__label">{dayNumber === 1 || dayNumber % 5 === 0 ? dayNumber : ''}</span>
            </div>
          )
        })}
      </div>
      <p className="ap-chart__total">Oy bo‘yicha jami: <strong>{displayNumber(total)}</strong></p>
    </div>
  )
}

function RankingPanel({ icon: Icon, title, subtitle, items, kind }) {
  return (
    <section className="ap-card" aria-label={title}>
      <div className="ap-card__head">
        <span className="ap-card__icon"><Icon size={16} /></span>
        <div><h3>{title}</h3><p>{subtitle}</p></div>
      </div>
      {items?.length ? (
        <ol className="ap-rank">
          {items.map((item, index) => (
            <li key={`${kind}-${item.id ?? item.genre ?? index}`}>
              <span className="ap-rank__n">{String(index + 1).padStart(2, '0')}</span>
              <span className="ap-rank__name">
                {kind === 'books' ? item.title : item.genre}
                <small>{kind === 'books' ? `${item.author || '—'} · ${item.genre || '—'}` : `${displayNumber(item.books)} ta kitob`}</small>
              </span>
              <span className="ap-rank__value">{displayNumber(item.pageReads)}<small>sahifa · {displayNumber(item.readers)} o‘quvchi</small></span>
            </li>
          ))}
        </ol>
      ) : <p className="ap-muted">Tanlangan oy uchun ma’lumot hali yo‘q.</p>}
    </section>
  )
}

export function OverviewSection({ stats, month, onMonthChange, onRefresh, loading, error, api }) {
  const summary = stats?.summary || {}
  const [daily, setDaily] = useState(null)
  const [metric, setMetric] = useState('pageReads')

  useEffect(() => {
    if (!month) return undefined
    let cancelled = false
    api(`/api/admin/stats/daily?month=${encodeURIComponent(month)}`)
      .then((data) => { if (!cancelled) setDaily(data.days) })
      .catch(() => { if (!cancelled) setDaily(null) })
    return () => { cancelled = true }
  }, [api, month, stats])

  const metrics = [
    ['Jami akkauntlar', summary.accountsTotal],
    ['Kutubxonadagi kitoblar', summary.booksTotal],
    ['Yangi ro‘yxatdan o‘tish', summary.registrations],
    ['Faol o‘quvchilar', summary.readers],
    ['O‘qilgan sahifalar', summary.pageReads],
    ['O‘qilgan kitoblar', summary.booksRead],
    ['Sharhlar', summary.reviews],
    ['Ayol akkauntlar', summary.femaleAccounts],
    ['Erkak akkauntlar', summary.maleAccounts],
    ['Jinsi ko‘rsatilmagan', summary.undisclosedGender],
  ]

  return (
    <div className="ap-stack">
      <div className="ap-toolbar">
        <label className="ap-field-inline">
          Hisobot oyi
          <input type="month" value={month || ''} onChange={(event) => onMonthChange?.(event.target.value)} aria-label="Hisobot oyini tanlang" />
        </label>
        <button type="button" className="ap-btn" onClick={() => onRefresh?.()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'ap-spin' : ''} /> {loading ? 'Yangilanmoqda' : 'Yangilash'}
        </button>
      </div>

      {error && <div className="ap-alert" role="alert"><CircleAlert size={16} /> {errorText(error)}</div>}

      {loading && !stats ? (
        <div className="ap-stats">{metrics.map(([label]) => <div key={label} className="ap-stat"><span>{label}</span><span className="ap-skeleton" /></div>)}</div>
      ) : (
        <div className="ap-stats">{metrics.map(([label, value]) => <StatCard key={label} label={label} value={value} />)}</div>
      )}

      <section className="ap-card">
        <div className="ap-card__head ap-card__head--split">
          <div><h3>Kunlik faollik</h3><p>{month || 'Oy tanlanmagan'}</p></div>
          <div className="ap-seg" role="tablist" aria-label="Grafik turi">
            <button type="button" role="tab" aria-selected={metric === 'pageReads'} className={metric === 'pageReads' ? 'is-on' : ''} onClick={() => setMetric('pageReads')}>O‘qilgan sahifalar</button>
            <button type="button" role="tab" aria-selected={metric === 'registrations'} className={metric === 'registrations' ? 'is-on' : ''} onClick={() => setMetric('registrations')}>Yangi a’zolar</button>
          </div>
        </div>
        {daily ? <DailyChart days={daily} metric={metric} /> : <Skeleton rows={1} />}
      </section>

      <div className="ap-grid-2">
        <RankingPanel icon={UsersRound} title="Ko‘p o‘qilgan janrlar" subtitle="Sahifa mutolaasi bo‘yicha" items={stats?.topGenres} kind="genres" />
        <RankingPanel icon={BookOpen} title="Ko‘p o‘qilgan kitoblar" subtitle="O‘quvchilar faolligi bo‘yicha" items={stats?.topBooks} kind="books" />
      </div>

      <p className="ap-note"><LockKeyhole size={14} /> Jins bo‘yicha ma’lumot faqat umumiy sonlarda ko‘rsatiladi. Foydalanuvchilar ro‘yxatida jins ko‘rinmaydi.</p>
    </div>
  )
}
