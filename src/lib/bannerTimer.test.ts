import { describe, expect, it } from 'vitest'
import { phases, splitLeft, statusOf, switchTime } from './bannerTimer'
import { buildIcs } from './calendar'

describe('banner timer', () => {
  it('switches at 06:00 UTC+8', () => {
    expect(new Date(switchTime('2026-12-02')).toISOString()).toBe('2026-12-01T22:00:00.000Z')
  })
  it('finds the live and the next phase', () => {
    const now = Date.UTC(2026, 10, 28, 8)
    const { current, next } = phases(now)
    expect(current?.runs.map((r) => r.banner)).toEqual(['Lottery_YeErMu', 'Lottery_ZhenHong'])
    expect(next?.runs[0].banner).toBe('Lottery_Exe')
    expect(statusOf(current!.runs[0], now)).toBe('now')
  })
  it('splits time left', () => {
    expect(splitLeft((3 * 1440 + 5 * 60 + 7) * 60_000)).toEqual({ days: 3, hours: 5, minutes: 7 })
  })
})

describe('calendar feed', () => {
  const ics = buildIcs('uk', new Date(Date.UTC(2026, 10, 28)))
  it('is valid iCalendar', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
  })
  it('has a start and a last-day event per run', () => {
    expect(ics).toContain('UID:Lottery_Exe-2026-12-02-start@hethereau-ledger.pages.dev')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261202')
    // Elyms ends when Exe starts, so its last day is 1 December.
    expect(ics).toMatch(/UID:Lottery_YeErMu-2026-11-11-last@[^\r]+\r\nDTSTAMP:[^\r]+\r\nDTSTART;VALUE=DATE:20261201/)
  })
})
