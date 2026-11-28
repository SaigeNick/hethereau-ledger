import { RUNS } from '../data/schedule'
import { FEATURED } from './bannerInfo'
import { lookup } from './dictionary'
import { switchTime, titleOf } from './bannerTimer'

/**
 * iCalendar feed of limited character banners: one event when a banner
 * starts and one on its last day. Served at /cal/uk.ics and /cal/en.ics so
 * calendars that subscribe pick up new phases on their own.
 */
const TEXT = {
  uk: {
    name: 'NTE: банери персонажів',
    start: (who: string) => `NTE: старт банера ${who}`,
    last: (who: string) => `NTE: останній день банера ${who}`,
    rerun: ' (повтор)',
    desc: (title: string) => `Лімітований банер «${title}». Час зміни банера залежить від сервера. Трекер: https://hethereau-ledger.pages.dev`,
  },
  en: {
    name: 'NTE: character banners',
    start: (who: string) => `NTE: ${who} banner starts`,
    last: (who: string) => `NTE: last day of the ${who} banner`,
    rerun: ' (rerun)',
    desc: (title: string) => `Limited banner “${title}”. The exact switch time depends on your server. Tracker: https://hethereau-ledger.pages.dev`,
  },
}

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '')
const nextDay = (ymd: string) => {
  const d = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8) + 1))
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}
/** Escapes text per RFC 5545 and folds lines at 75 octets. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
function fold(line: string) {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const out: string[] = []
  let cur = ''
  let len = 0
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length
    if (len + n > (out.length ? 74 : 75)) {
      out.push(cur)
      cur = ''
      len = 0
    }
    cur += ch
    len += n
  }
  out.push(cur)
  return out.join('\r\n ')
}

export function buildIcs(lang: 'uk' | 'en', now = new Date()): string {
  const x = TEXT[lang]
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hethereau Ledger//Banners//' + lang.toUpperCase(),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(x.name)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:P1D',
  ]
  for (const run of RUNS) {
    const id = FEATURED[run.banner]
    const who = (id && lookup(id)?.name) || titleOf(run)
    const label = who + (run.rerun ? x.rerun : '')
    // Calendar days in UTC+8, where the switch happens first.
    const startDay = day(switchTime(run.start) + 8 * 3_600_000)
    const lastDay = day(switchTime(run.end) + 8 * 3_600_000 - 86_400_000)
    for (const [kind, date, summary] of [
      ['start', startDay, x.start(label)],
      ['last', lastDay, x.last(label)],
    ] as const) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${run.banner}-${run.start}-${kind}@hethereau-ledger.pages.dev`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${date}`,
        `DTEND;VALUE=DATE:${nextDay(date)}`,
        `SUMMARY:${esc(summary)}`,
        `DESCRIPTION:${esc(x.desc(titleOf(run)))}`,
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      )
    }
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
