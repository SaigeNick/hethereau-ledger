import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Milestones } from '../components/BannerList'
import { Portrait } from '../components/Portrait'
import { RUNS, TITLES, type BannerRun } from '../data/schedule'
import { ARC_FEATURED, arcBannerOf } from '../data/arcBanners'
import { FEATURED } from '../lib/bannerInfo'
import { isBonus } from '../lib/banners'
import { lookup, resolveAll } from '../lib/dictionary'
import { useI18n, type Lang } from '../lib/i18n'
import { computeStats } from '../lib/stats'
import { fmtEur, pullValue } from '../lib/spend'
import { arcPity } from '../lib/arc'
import { useStore } from '../lib/store'
import type { PullRecord } from '../lib/types'
import { daysUk, pluralUk, pullsUk, rollsUk } from '../lib/plural'

const TEXT = {
  uk: {
    title: 'Архів банерів',
    lead: 'Усі лімітовані банери персонажів з датами. Якщо ви імпортували історію командою, тут видно, скільки ви крутили на кожному банері і що отримали.',
    version: 'Версія',
    now: 'Зараз',
    soon: 'Скоро',
    rerun: 'Повтор',
    board: 'Дошка',
    rolls: rollsUk,
    sAt: (p: number) => `S на ${p}-му`,
    arc: pullsUk,
    at: (p: number) => `на ${p}-й`,
    none: 'Не крутили',
    milestones: 'Пороги банера: 50, 120, 200 кидків (рахуються разом із повторами банера)',
    tabTime: 'Хронологія',
    tabChars: 'Персонажі',
    charsLead: 'Скільки минуло з останнього банера кожного персонажа. Чим довше, тим ймовірніший повтор.',
    daysAgo: daysUk,
    ago: 'тому',
    inDays: (n: number) => `через ${daysUk(n)}`,
    last: 'Востаннє',
    next: 'Повтор',
    runs: (n: number) => pluralUk(n, 'банер', 'банери', 'банерів'),
    note: 'Дати взято з офіційних анонсів версій; банер змінюється в день оновлення. Особиста статистика є лише для круток, імпортованих командою.',
  },
  en: {
    title: 'Banner archive',
    lead: 'Every limited character banner with its dates. If you imported your history with the command, you can see how much you rolled on each banner and what you got.',
    version: 'Version',
    now: 'Now',
    soon: 'Soon',
    rerun: 'Rerun',
    board: 'Board',
    rolls: (n: number) => `${n} roll${n === 1 ? '' : 's'}`,
    sAt: (p: number) => `S on roll ${p}`,
    arc: (n: number) => `${n} pull${n === 1 ? '' : 's'}`,
    at: (p: number) => `on pull ${p}`,
    none: 'Not pulled',
    milestones: 'Banner milestones: 50, 120 and 200 rolls (reruns of the banner count too)',
    tabTime: 'Timeline',
    tabChars: 'Characters',
    charsLead: 'How long since each character’s last banner. The longer the wait, the likelier a rerun.',
    daysAgo: (n: number) => `${n} day${n === 1 ? '' : 's'}`,
    ago: 'ago',
    inDays: (n: number) => `in ${n} day${n === 1 ? '' : 's'}`,
    last: 'Last',
    next: 'Rerun',
    runs: (n: number) => `${n} banner${n === 1 ? '' : 's'}`,
    note: 'Dates come from official version previews; banners switch on update day. Personal stats only cover pulls imported with the command.',
  },
}

const DAY = 86_400_000
const days = (from: string, to: string) => Math.round((Date.parse(to + 'T12:00:00') - Date.parse(from + 'T12:00:00')) / DAY)

interface CharView {
  banner: string
  last?: BannerRun
  current?: BannerRun
  next?: BannerRun
  count: number
}

function charViews(now: string): CharView[] {
  const by = new Map<string, BannerRun[]>()
  for (const r of RUNS) by.set(r.banner, [...(by.get(r.banner) ?? []), r])
  return [...by.entries()].map(([banner, runs]) => {
    const sorted = [...runs].sort((a, b) => (a.start < b.start ? -1 : 1))
    return {
      banner,
      last: [...sorted].reverse().find((r) => r.end <= now),
      current: sorted.find((r) => r.start <= now && now < r.end),
      next: sorted.find((r) => now < r.start),
      count: sorted.filter((r) => r.start <= now).length,
    }
  })
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface RunView {
  run: BannerRun
  status: 'past' | 'now' | 'soon'
  pulls: number
  sPities: number[]
  /** Pulls on this banner ID up to the end of this run (milestones carry over to reruns). */
  milestonePulls: number
  arcPulls: number
  arcS: { name: string; pity: number; featured: boolean }[]
}

function useRuns(records: PullRecord[], arcRecords: PullRecord[]): RunView[] {
  return useMemo(() => {
    const resolved = resolveAll(records)
    const pityByUid = new Map(computeStats('Lottery_LimitedCharacter', resolved).sDrops.map((d) => [d.record.uid, d.pity]))
    const arcs = resolveAll(arcRecords)
    const arcSPity = new Map(computeStats('Arc_MiracleBox', arcs).sDrops.map((d) => [d.record.uid, d.pity]))
    const { featuredPity } = arcPity(arcs)
    const now = today()
    return RUNS.map((run) => {
      const mine = resolved.filter((r) => r.banner === run.banner && !isBonus(r) && (r.kind === 'dice' || r.kind === 'manual'))
      const within = (r: PullRecord) => r.time.slice(0, 10) >= run.start && r.time.slice(0, 10) < run.end
      const inRun = mine.filter(within)
      // A rerun shares its Arc banner with the original run; dates tell them apart.
      const arcBanner = arcBannerOf(run.banner)
      const arcRun = arcBanner ? arcs.filter((r) => r.banner === arcBanner && within(r)) : []
      return {
        run,
        status: now < run.start ? 'soon' : now < run.end ? 'now' : 'past',
        pulls: inRun.length,
        sPities: inRun.filter((r) => r.rank === 'S' && r.rewardType === 'character').map((r) => pityByUid.get(r.uid) ?? 0),
        milestonePulls: mine.filter((r) => r.time.slice(0, 10) < run.end).length,
        arcPulls: arcRun.length,
        arcS: arcRun
          .filter((r) => r.rank === 'S')
          .map((r) => ({ name: r.name, pity: featuredPity.get(r.uid) ?? arcSPity.get(r.uid) ?? 0, featured: !!arcBanner && ARC_FEATURED[arcBanner] === r.rewardId })),
      } satisfies RunView
    })
  }, [records, arcRecords])
}

function fmtRange(run: BannerRun, lang: Lang) {
  const f = new Intl.DateTimeFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'short' })
  const d = (s: string) => f.format(new Date(s + 'T12:00:00'))
  return `${d(run.start)} – ${d(run.end)}`
}

export function BannersPage() {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const { active } = useStore()
  const views = useRuns(active.records.Lottery_LimitedCharacter, active.records.Arc_MiracleBox)

  const [tab, setTab] = useState<'time' | 'chars'>(() => {
    try {
      return localStorage.getItem('hethereau-ledger.archiveTab') === 'chars' ? 'chars' : 'time'
    } catch {
      return 'time'
    }
  })
  const pick = (t: 'time' | 'chars') => {
    setTab(t)
    try {
      localStorage.setItem('hethereau-ledger.archiveTab', t)
    } catch {
      /* ignore */
    }
  }
  const versions = useMemo(() => {
    const m = new Map<string, RunView[]>()
    for (const v of views) m.set(v.run.version, [...(m.get(v.run.version) ?? []), v])
    return [...m.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([ver, list]) => [ver, list.sort((a, b) => (a.run.start === b.run.start ? Number(!!a.run.rerun) - Number(!!b.run.rerun) : a.run.start < b.run.start ? 1 : -1))] as const)
  }, [views])

  return (
    <article className="archive">
      <h1>{x.title}</h1>
      <p className="lead">{x.lead}</p>
      <div className="seg archive-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'time'} className={tab === 'time' ? 'is-on' : ''} onClick={() => pick('time')}>
          {x.tabTime}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'chars'} className={tab === 'chars' ? 'is-on' : ''} onClick={() => pick('chars')}>
          {x.tabChars}
        </button>
      </div>
      {tab === 'chars' && <CharsView />}
      {tab === 'time' && versions.map(([ver, list]) => (
        <section key={ver}>
          <h2>
            {x.version} {ver}
          </h2>
          <ol className="runs">
            {list.map((v) => {
              const id = FEATURED[v.run.banner] ?? ''
              const name = lookup(id)?.name ?? v.run.banner.replace(/^Lottery_/, '')
              return (
                <li key={v.run.banner + v.run.start} className={'run is-' + v.status}>
                  <Portrait id={id} name={name} rank="S" />
                  <div className="run-main">
                    <p className="run-head">
                      <strong>{name}</strong>
                      {v.status === 'now' && <span className="tag tag-now">{x.now}</span>}
                      {v.status === 'soon' && <span className="tag">{x.soon}</span>}
                      {v.run.rerun && <span className="tag tag-rerun">{x.rerun}</span>}
                    </p>
                    <p className="muted run-sub">
                      {TITLES[v.run.banner] ?? ''} · {fmtRange(v.run, lang)}
                    </p>
                    {(v.pulls > 0 || v.arcPulls > 0) && (
                      <div className="run-stats">
                        {v.pulls > 0 && (
                          <>
                            <p className="run-line">
                              <span className="run-label">{x.board}</span>
                              <span className="rc">{x.rolls(v.pulls)}</span>
                              <span className="rc rc-quiet">≈ {fmtEur(pullValue(v.pulls).eur, lang)}</span>
                              {v.sPities.map((p, i) => (
                                <span key={i} className="rc rc-s">
                                  {x.sAt(p)}
                                </span>
                              ))}
                            </p>
                            <div className="run-ms" title={x.milestones}>
                              <Milestones pulls={v.milestonePulls} />
                            </div>
                          </>
                        )}
                        {v.arcPulls > 0 && (
                          <p className="run-line">
                            <span className="run-label">Arc</span>
                            <span className="rc">{x.arc(v.arcPulls)}</span>
                            {v.arcS.map((a, i) => (
                              <span key={i} className={'rc ' + (a.featured ? 'rc-s' : 'rc-quiet')} title={a.featured ? 'UP Arc' : undefined}>
                                {a.featured ? '★ ' : ''}
                                {a.name} {x.at(a.pity)}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                    )}
                    {v.pulls === 0 && v.arcPulls === 0 && v.status !== 'soon' && <p className="muted run-none">{x.none}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
      <p className="note muted">
        {x.note} <Link to="/import">{lang === 'uk' ? 'Імпорт' : 'Import'}</Link>
      </p>
    </article>
  )
}

function CharsView() {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const now = today()
  const list = useMemo(() => {
    const v = charViews(now)
    const rank = (c: CharView) => (c.current ? -1 : c.last ? days(c.last.end, now) : -2)
    return v.sort((a, b) => rank(b) - rank(a))
  }, [now])
  return (
    <section>
      <p className="muted">{x.charsLead}</p>
      <ol className="runs chars">
        {list.map((c) => {
          const id = FEATURED[c.banner] ?? ''
          const name = lookup(id)?.name ?? c.banner.replace(/^Lottery_/, '')
          const ref = c.current ?? c.last ?? c.next
          return (
            <li key={c.banner} className={'run' + (c.current ? ' is-now' : !c.last ? ' is-soon' : '')}>
              <Portrait id={id} name={name} rank="S" />
              <div className="run-main">
                <p className="run-head">
                  <strong>{name}</strong>
                  {c.current && <span className="tag tag-now">{x.now}</span>}
                  {!c.current && c.next && (
                    <span className={'tag' + (c.last ? ' tag-rerun' : '')}>
                      {c.last ? x.next : x.soon} {x.inDays(days(now, c.next.start))}
                    </span>
                  )}
                </p>
                <p className="muted run-sub">
                  {ref && `${c.current ? '' : c.last ? x.last + ': ' : ''}${fmtRange(ref, lang)} · ${x.version} ${ref.version}`}
                  {c.count > 0 && ` · ${x.runs(c.count)}`}
                </p>
              </div>
              {!c.current && c.last && (
                <p className="since">
                  <strong>{x.daysAgo(days(c.last.end, now))}</strong>
                  <span className="muted">{x.ago}</span>
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
