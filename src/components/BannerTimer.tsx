import { useEffect, useRef, useState } from 'react'
import { FEATURED } from '../lib/bannerInfo'
import { phases, splitLeft, switchTime, titleOf } from '../lib/bannerTimer'
import { lookup } from '../lib/dictionary'
import { useI18n } from '../lib/i18n'
import type { BannerRun } from '../data/schedule'
import { Portrait } from './Portrait'

const TEXT = {
  uk: {
    now: 'Зараз на банерах',
    next: 'Далі',
    from: (d: string) => `з ${d}`,
    until: (d: string) => `до ${d}`,
    left: 'до кінця',
    startsIn: 'до старту',
    days: (n: number) => `${n} дн.`,
    hours: (n: number) => `${n} год`,
    minutes: (n: number) => `${n} хв`,
    rerun: 'повтор',
    note: 'Рахуємо до найранішої зміни банера (06:00 за UTC+8). На вашому сервері банер може тривати на кілька годин довше.',
    calendar: 'Додати в календар',
    google: 'Google Календар',
    apple: 'Apple Календар чи Outlook',
    file: 'Завантажити файл .ics',
    calNote: 'Це підписка: нові банери з’являтимуться в календарі самі — старт і останній день кожного.',
  },
  en: {
    now: 'On the banners now',
    next: 'Next',
    from: (d: string) => `from ${d}`,
    until: (d: string) => `until ${d}`,
    left: 'left',
    startsIn: 'until it starts',
    days: (n: number) => `${n}d`,
    hours: (n: number) => `${n}h`,
    minutes: (n: number) => `${n}m`,
    rerun: 'rerun',
    note: 'Counted to the earliest banner switch (06:00 UTC+8). On your server the banner may last a few hours longer.',
    calendar: 'Add to calendar',
    google: 'Google Calendar',
    apple: 'Apple Calendar or Outlook',
    file: 'Download the .ics file',
    calNote: 'It’s a subscription: new banners show up in your calendar on their own, with each start and last day.',
  },
}

function useNow(stepMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), stepMs)
    return () => clearInterval(id)
  }, [stepMs])
  return now
}

function Who({ run, size }: { run: BannerRun; size: number }) {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const id = FEATURED[run.banner]
  const r = id ? lookup(id) : null
  const name = r?.name ?? titleOf(run)
  return (
    <div className="timer-who">
      <Portrait id={id ?? ''} name={name} rank="S" size={size} />
      <div>
        <strong>{name}</strong>
        {run.rerun && <span className="tag">{x.rerun}</span>}
        <span className="muted small">{titleOf(run)}</span>
      </div>
    </div>
  )
}

export function CalendarButton() {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const path = `${location.host}/cal/${lang}.ics`
  const webcal = `webcal://${path}`
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const close = (e: Event) => {
      const d = ref.current
      if (d?.open && (e instanceof KeyboardEvent ? e.key === 'Escape' : !d.contains(e.target as Node))) d.open = false
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [])
  return (
    <details className="cal-menu" ref={ref}>
      <summary className="btn btn--ghost">{x.calendar}</summary>
      <div className="cal-pop">
        <a href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noopener noreferrer">
          {x.google}
        </a>
        <a href={webcal}>{x.apple}</a>
        <a href={`https://${path}`} download={`nte-banners-${lang}.ics`}>
          {x.file}
        </a>
        <p className="muted small">{x.calNote}</p>
      </div>
    </details>
  )
}

export function BannerTimer() {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const now = useNow()
  const { current, next } = phases(now)
  if (!current && !next) return null
  const date = (d: string) => new Date(switchTime(d) + 8 * 3_600_000).toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  const fmt = (ms: number) => {
    const t = splitLeft(ms)
    return t.days > 0 ? `${x.days(t.days)} ${x.hours(t.hours)}` : `${x.hours(t.hours)} ${x.minutes(t.minutes)}`
  }

  return (
    <section className="timer-card" aria-label={x.now}>
      {current && (
        <div className="timer-block">
          <p className="muted small">{x.now}</p>
          <div className="timer-runs">
            {current.runs.map((r) => (
              <Who key={r.banner + r.start} run={r} size={52} />
            ))}
          </div>
          <p className="timer-left">
            <strong>{fmt(switchTime(current.end) - now)}</strong> {x.left} <span className="muted">· {x.until(date(current.end))}</span>
          </p>
        </div>
      )}
      {next && (
        <div className="timer-block timer-block--next">
          <p className="muted small">
            {x.next} · {x.from(date(next.start))}
            {!current && (
              <>
                {' '}
                · <strong>{fmt(switchTime(next.start) - now)}</strong> {x.startsIn}
              </>
            )}
          </p>
          <div className="timer-runs">
            {next.runs.map((r) => (
              <Who key={r.banner + r.start} run={r} size={40} />
            ))}
          </div>
        </div>
      )}
      <div className="timer-foot">
        <CalendarButton />
        <p className="muted small">{x.note}</p>
      </div>
    </section>
  )
}
