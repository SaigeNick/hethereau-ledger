import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Milestones } from '../components/BannerList'
import { Portrait } from '../components/Portrait'
import { RUNS, TITLES, type BannerRun } from '../data/schedule'
import { FEATURED } from '../lib/bannerInfo'
import { isBonus } from '../lib/banners'
import { lookup, resolveAll } from '../lib/dictionary'
import { useI18n, type Lang } from '../lib/i18n'
import { computeStats } from '../lib/stats'
import { useStore } from '../lib/store'
import type { PullRecord } from '../lib/types'

const TEXT = {
  uk: {
    title: 'Архів банерів',
    lead: 'Усі лімітовані банери персонажів з датами. Якщо ти імпортував історію командою, тут видно, скільки ти крутив на кожному і що вибив.',
    version: 'Версія',
    now: 'Зараз',
    soon: 'Скоро',
    rerun: 'Повтор',
    you: (n: number) => `Ти: ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'кидок' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'кидки' : 'кидків'}`,
    sAt: (p: number) => `S на ${p}-му`,
    none: 'Не крутив',
    milestones: 'Етапи банера (рахуються разом з повторами)',
    note: 'Дати взято з офіційних анонсів версій; банер змінюється в день оновлення. Особиста статистика є лише для круток, імпортованих командою синхронізації.',
  },
  en: {
    title: 'Banner archive',
    lead: 'Every limited character banner with its dates. If you imported your history with the sync command, you can see how much you pulled on each and what you got.',
    version: 'Version',
    now: 'Now',
    soon: 'Soon',
    rerun: 'Rerun',
    you: (n: number) => `You: ${n} roll${n === 1 ? '' : 's'}`,
    sAt: (p: number) => `S at ${p}`,
    none: 'Not pulled',
    milestones: 'Banner milestones (shared with reruns)',
    note: 'Dates come from official version previews; banners switch on update day. Personal stats only cover pulls imported with the sync command.',
  },
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
}

function useRuns(records: PullRecord[]): RunView[] {
  return useMemo(() => {
    const resolved = resolveAll(records)
    const pityByUid = new Map(computeStats('Lottery_LimitedCharacter', resolved).sDrops.map((d) => [d.record.uid, d.pity]))
    const now = today()
    return RUNS.map((run) => {
      const mine = resolved.filter((r) => r.banner === run.banner && !isBonus(r) && (r.kind === 'dice' || r.kind === 'manual'))
      const inRun = mine.filter((r) => r.time.slice(0, 10) >= run.start && r.time.slice(0, 10) < run.end)
      return {
        run,
        status: now < run.start ? 'soon' : now < run.end ? 'now' : 'past',
        pulls: inRun.length,
        sPities: inRun.filter((r) => r.rank === 'S' && r.rewardType === 'character').map((r) => pityByUid.get(r.uid) ?? 0),
        milestonePulls: mine.filter((r) => r.time.slice(0, 10) < run.end).length,
      } satisfies RunView
    })
  }, [records])
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
  const views = useRuns(active.records.Lottery_LimitedCharacter)

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
      {versions.map(([ver, list]) => (
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
                    {v.pulls > 0 ? (
                      <>
                        <p className="run-you">
                          {x.you(v.pulls)}
                          {v.sPities.map((p, i) => (
                            <span key={i} className="run-s">
                              {x.sAt(p)}
                            </span>
                          ))}
                        </p>
                        <div title={x.milestones}>
                          <Milestones pulls={v.milestonePulls} />
                        </div>
                      </>
                    ) : (
                      v.status !== 'soon' && <p className="muted run-you">{x.none}</p>
                    )}
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
