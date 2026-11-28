import { RUNS, TITLES, type BannerRun } from '../data/schedule'

/**
 * Banners switch on the schedule date. Version updates start at 06:00 UTC+8
 * for every region, and mid-version phases end at 05:59 server time, so
 * 06:00 UTC+8 (22:00 UTC the day before) is the earliest switch anywhere.
 * Counting to it never promises more time than a player really has.
 */
export function switchTime(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d - 1, 22, 0, 0)
}

export type RunStatus = 'past' | 'now' | 'soon'

export function statusOf(run: BannerRun, now = Date.now()): RunStatus {
  if (now < switchTime(run.start)) return 'soon'
  return now < switchTime(run.end) ? 'now' : 'past'
}

export interface Phase {
  runs: BannerRun[]
  start: string
  end: string
}

/** Runs grouped by their dates: the live phase and the next one, if known. */
export function phases(now = Date.now()) {
  const byStart = new Map<string, BannerRun[]>()
  for (const r of RUNS) byStart.set(r.start, [...(byStart.get(r.start) ?? []), r])
  const all: Phase[] = [...byStart.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([start, runs]) => ({ runs: runs.sort((a, b) => Number(!!a.rerun) - Number(!!b.rerun)), start, end: runs[0].end }))
  const current = all.find((p) => switchTime(p.start) <= now && now < switchTime(p.end)) ?? null
  const next = all.find((p) => switchTime(p.start) > now) ?? null
  return { current, next }
}

export const titleOf = (run: BannerRun) => TITLES[run.banner] ?? run.banner

/** Time left as days and hours, or hours and minutes on the last day. */
export function splitLeft(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60_000))
  return { days: Math.floor(m / 1440), hours: Math.floor((m % 1440) / 60), minutes: m % 60 }
}
