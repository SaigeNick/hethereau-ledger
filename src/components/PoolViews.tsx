import { ANNULITH_PER_PULL, fmtEur, pullValue } from '../lib/spend'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FEATURED } from '../lib/bannerInfo'
import { isBonus, RULES } from '../lib/banners'
import { resolveAll } from '../lib/dictionary'
import { useI18n } from '../lib/i18n'
import { sortChrono } from '../lib/importer'
import { bannerStats, computeStats, type PoolStats } from '../lib/stats'
import { POOL_IDS, type PoolId, type PoolRecords, type PullRecord } from '../lib/types'
import { BannerList, bannerName, Milestones } from './BannerList'
import { BoardLegend, PityBoard } from './PityBoard'
import { PityHistogram } from './PityHistogram'
import { Portrait } from './Portrait'
import { countSessions, SessionList, type Row } from './Tiles'

export function hasAnyRecords(records: PoolRecords) {
  return POOL_IDS.some((p) => records[p].length > 0)
}

/** Cost of one dice or Tri-Key in Annulith. */

function luckPct(s: PoolStats) {
  return s.luck === null ? null : Math.round((s.luck - 1) * 100)
}

function LuckText({ s }: { s: PoolStats }) {
  const { t } = useI18n()
  const pct = luckPct(s)
  if (pct === null) return <span className="muted">{t('luck.none')}</span>
  if (pct === 0) return <>{t('luck.even')}</>
  return <>{pct > 0 ? t('luck.better', { n: pct }) : t('luck.worse', { n: -pct })}</>
}

function StatRow({ s }: { s: PoolStats }) {
  const { t } = useI18n()
  const rules = RULES[s.pool]
  const typical = rules.consolidatedRate ? Math.round(1 / rules.consolidatedRate) : null
  return (
    <dl className="stats">
      <div>
        <dt>{t('stat.total')}</dt>
        <dd>{s.totalPulls}</dd>
      </div>
      <div>
        <dt>{t('stat.sCount')}</dt>
        <dd>{s.sDrops.length}</dd>
      </div>
      {rules.hardPity && (
        <div>
          <dt>{t('stat.avg')}</dt>
          <dd>
            {s.avgPity ? s.avgPity.toFixed(1) : '—'}
            {typical && <small>{t('stat.typical', { n: typical })}</small>}
          </dd>
        </div>
      )}
      {rules.hardPity && (
        <div>
          <dt>{t('stat.luck')}</dt>
          <dd className="dd-text">
            <LuckText s={s} />
          </dd>
        </div>
      )}
      {rules.system === 'monopoly' && (
        <div>
          <dt>{t('stat.bonus')}</dt>
          <dd>
            {s.bonusCount}
            <small>{t('stat.bonusNote')}</small>
          </dd>
        </div>
      )}
    </dl>
  )
}

/** The last few S drops as portraits with the pull they landed on. */
function RecentS({ s, max = 6 }: { s: PoolStats; max?: number }) {
  const { t } = useI18n()
  if (s.sDrops.length === 0) return <p className="muted small">{t('overview.noS')}</p>
  return (
    <ul className="recent-s">
      {[...s.sDrops]
        .reverse()
        .slice(0, max)
        .map((d) => (
          <li key={d.record.uid} title={`${d.record.name} · ${d.pity}`}>
            <Portrait id={d.record.rewardId} name={d.record.name} rank="S" size={48} />
            <span className="recent-pity">{d.pity}</span>
          </li>
        ))}
    </ul>
  )
}

function PoolCard({ s, base, featured }: { s: PoolStats; base: string; featured?: boolean }) {
  const { t } = useI18n()
  const rules = RULES[s.pool]
  const empty = s.totalPulls === 0
  const pct = luckPct(s)
  return (
    <article className={'pool-card' + (featured ? ' is-featured' : '') + (empty ? ' is-empty' : '')}>
      <header>
        <h2>{t(`pool.${s.pool}` as never)}</h2>
        {rules.hardPity && !empty && (
          <p className="pity-number">
            <strong>{s.currentPity}</strong>
            <span>{t('stat.pityOf', { n: rules.hardPity })}</span>
          </p>
        )}
      </header>
      {empty ? (
        <p className="muted">{t('overview.noData')}</p>
      ) : (
        <>
          {rules.hardPity && <PityBoard current={s.currentPity} max={rules.hardPity} soft={rules.softFrom} cols={{ wide: 30, narrow: 30 }} compact />}
          <dl className="mini-stats">
            <div>
              <dt>{t('stat.total')}</dt>
              <dd>{s.totalPulls}</dd>
            </div>
            <div>
              <dt>{t('stat.sCount')}</dt>
              <dd>{s.sDrops.length}</dd>
            </div>
            {rules.hardPity && (
              <div>
                <dt>{t('stat.avgShort')}</dt>
                <dd>{s.avgPity ? s.avgPity.toFixed(1) : '—'}</dd>
              </div>
            )}
            {pct !== null && (
              <div>
                <dt>{t('stat.luck')}</dt>
                <dd className={pct >= 0 ? 'is-lucky' : 'is-unlucky'}>
                  {pct > 0 ? '+' : ''}
                  {pct}%
                </dd>
              </div>
            )}
          </dl>
          {rules.hardPity && <RecentS s={s} max={featured ? 8 : 5} />}
        </>
      )}
      <Link className={'btn' + (empty ? ' btn--ghost' : '')} to={empty ? '/import' : `${base}/pool/${s.pool}`}>
        {empty ? t('overview.empty.import') : t('overview.openHistory')}
      </Link>
    </article>
  )
}

export function OverviewBody({ records, base }: { records: PoolRecords; base: string }) {
  const { t, fmtDate, lang } = useI18n()
  const resolved = useMemo(() => Object.fromEntries(POOL_IDS.map((p) => [p, resolveAll(records[p])])) as PoolRecords, [records])
  const stats = useMemo(() => POOL_IDS.map((p) => computeStats(p, resolved[p])), [resolved])
  const banners = useMemo(() => bannerStats(resolved.Lottery_LimitedCharacter, FEATURED), [resolved])
  const current = banners[0]
  const paid = stats.filter((s) => s.pool !== 'Gashapon_MysteryBox').reduce((a, s) => a + s.totalPulls, 0)
  const allS = stats.filter((s) => s.pool !== 'Gashapon_MysteryBox').reduce((a, s) => a + s.sDrops.length, 0)

  return (
    <div className="overview2">
      <dl className="totals">
        <div>
          <dt>{t('totals.pulls')}</dt>
          <dd>{paid.toLocaleString()}</dd>
        </div>
        <div>
          <dt>{t('totals.s')}</dt>
          <dd>{allS}</dd>
        </div>
        <div>
          <dt>{t('totals.annulith')}</dt>
          <dd>{(paid * ANNULITH_PER_PULL).toLocaleString()}</dd>
        </div>
        <div title={t('totals.valueNote')}>
          <dt>{t('totals.value')}</dt>
          <dd>≈ {fmtEur(pullValue(paid).eur, lang)}</dd>
        </div>
      </dl>

      {current && (
        <section className="current-banner">
          <Portrait id={current.featuredId ?? ''} name={bannerName(current)} rank="S" size={96} />
          <div className="cb-main">
            <p className="muted small">
              {t('overview.lastBanner')} · {fmtDate(current.lastTime)}
            </p>
            <h2>{bannerName(current)}</h2>
            <p className="cb-pulls">
              <strong>{current.pulls}</strong> {t('overview.rollsOnBanner')}
              {current.sDrops.length > 0 && <span className="muted"> · {t('banner.gotS', { n: current.sDrops.length })}</span>}
            </p>
            <Milestones pulls={current.pulls} labelled />
          </div>
        </section>
      )}

      <div className="pool-grid">
        {stats.map((s, i) => (
          <PoolCard key={s.pool} s={s} base={base} featured={i === 0} />
        ))}
      </div>

      {banners.length > 1 && (
        <section className="all-banners">
          <h2>{t('banner.banners')}</h2>
          <p className="muted">{t('banner.bannersNote')}</p>
          <BannerList banners={banners} />
        </section>
      )}
    </div>
  )
}

type Tab = 'history' | 'stats'
type View = 'tiles' | 'table'

function savedView(): View {
  try {
    return localStorage.getItem('hethereau-ledger.view') === 'table' ? 'table' : 'tiles'
  } catch {
    return 'tiles'
  }
}

export function BannerBody({
  pool,
  records,
  base,
  onDelete,
}: {
  pool: PoolId
  records: PullRecord[]
  base: string
  onDelete?: (uid: string) => void
}) {
  const { t, fmtDate } = useI18n()
  records = resolveAll(records)
  const rules = RULES[pool]
  const s = useMemo(() => computeStats(pool, records), [pool, records])
  const [tab, setTab] = useState<Tab>('history')
  const [view, setViewState] = useState<View>(savedView)
  const [filter, setFilter] = useState<'all' | 'top' | 'bonus'>('all')
  const [limit, setLimit] = useState(20)
  const setView = (v: View) => {
    setViewState(v)
    try {
      localStorage.setItem('hethereau-ledger.view', v)
    } catch {
      /* ignore */
    }
  }

  // Pity at each row, newest first.
  const rows = useMemo(() => {
    let counter = 0
    const out: Row[] = []
    for (const r of sortChrono(records)) {
      const pull = rules.isPull(r)
      if (pull) counter++
      out.push({ r, pity: pull || rules.isTopDrop(r) ? Math.max(counter, 1) : null })
      if (rules.isTopDrop(r)) counter = 0
    }
    return out.reverse()
  }, [records, rules])
  const shown =
    filter === 'all'
      ? rows
      : filter === 'bonus'
        ? rows.filter((x) => isBonus(x.r))
        : rows.filter((x) => !isBonus(x.r) && (x.r.rank === 'S' || x.r.rank === 'A') && x.r.rewardType !== 'item')
  const hasBonus = rows.some((x) => isBonus(x.r))
  const banners = useMemo(() => (pool === 'Lottery_LimitedCharacter' ? bannerStats(records, FEATURED) : []), [pool, records])
  const sessions = view === 'tiles' ? countSessions(shown) : shown.length
  const step = view === 'tiles' ? 20 : 100

  return (
    <div className="banner">
      <p className="back">
        <Link to={base || '/'}>{t('banner.back')}</Link>
      </p>
      <h1>{t(`pool.${pool}` as never)}</h1>
      <p className="lead muted">{t(`poolhint.${pool}` as never)}</p>

      {rules.hardPity && (
        <section className="board-section">
          <p className="pity-number pity-number--big">
            <strong>{s.currentPity}</strong>
            <span>{t('stat.pityOf', { n: rules.hardPity })}</span>
          </p>
          <PityBoard current={s.currentPity} max={rules.hardPity} soft={rules.softFrom} cols={rules.trackCols} />
          <BoardLegend max={rules.hardPity} soft={rules.softFrom} />
        </section>
      )}

      <StatRow s={s} />

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>
          {t('tab.history')}
        </button>
        <button role="tab" aria-selected={tab === 'stats'} onClick={() => setTab('stats')}>
          {t('tab.stats')}
        </button>
      </div>

      {tab === 'history' && (
        <section className="history-section" role="tabpanel">
          <div className="section-head">
            <div className="seg" role="group" aria-label={t('banner.history')}>
              <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                {t('banner.filter.all')}
              </button>
              <button aria-pressed={filter === 'top'} onClick={() => setFilter('top')}>
                {t('banner.filter.top')}
              </button>
              {hasBonus && (
                <button aria-pressed={filter === 'bonus'} onClick={() => setFilter('bonus')}>
                  {t('banner.filter.bonus')}
                </button>
              )}
            </div>
            <div className="seg" role="group" aria-label={t('view.label')}>
              <button aria-pressed={view === 'tiles'} onClick={() => setView('tiles')}>
                {t('view.tiles')}
              </button>
              <button aria-pressed={view === 'table'} onClick={() => setView('table')}>
                {t('view.table')}
              </button>
            </div>
          </div>

          {view === 'tiles' ? (
            <SessionList rows={shown} limit={limit} fmtTime={fmtDate} />
          ) : (
            <div className="table-scroll">
              <table className="history">
                <thead>
                  <tr>
                    <th>{t('banner.col.time')}</th>
                    <th>{t('banner.col.reward')}</th>
                    <th>{t('banner.col.rank')}</th>
                    {rules.hardPity && <th className="num">{t('banner.col.pity')}</th>}
                    {onDelete && <th aria-label={t('banner.delete')} />}
                  </tr>
                </thead>
                <tbody>
                  {shown.slice(0, limit).map(({ r, pity }) => (
                    <tr key={r.uid} className={isBonus(r) ? 'row-bonus' : r.rewardType === 'item' || r.rank === '?' ? 'row-plain' : `row-${r.rank}`}>
                      <td className="muted nowrap">{r.time.slice(0, 16)}</td>
                      <td>
                        {r.name}
                        {r.qty && r.qty > 1 ? <span className="muted"> ×{r.qty}</span> : null}
                        {r.manual && <span className="tag">{t('banner.manualTag')}</span>}
                        {isBonus(r) && <span className="tag">{t(`banner.bonus.${r.kind}` as never)}</span>}
                      </td>
                      <td>
                        <span className={`rank rank-${r.rank === '?' ? 'u' : r.rank}`}>{r.rank === '?' ? t('rank.?') : r.rank}</span>
                      </td>
                      {rules.hardPity && <td className="num">{pity ?? ''}</td>}
                      {onDelete && (
                        <td>
                          {r.manual && (
                            <button className="icon-btn" aria-label={t('banner.delete')} title={t('banner.delete')} onClick={() => onDelete(r.uid)}>
                              ×
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sessions > limit && (
            <button className="btn btn--ghost more" onClick={() => setLimit((l) => l + step)}>
              {t('banner.more')}
            </button>
          )}
          {shown.length === 0 && <p className="muted">{t('banner.historyEmpty')}</p>}
        </section>
      )}

      {tab === 'stats' && (
        <div role="tabpanel">
          {rules.consolidatedRate && s.luck !== null && (
            <p className="note muted">{t('luck.note', { rate: (rules.consolidatedRate * 100).toFixed(2) })}</p>
          )}
          <section>
            <h2>{t('banner.drops')}</h2>
            {s.sDrops.length === 0 ? (
              <p className="muted">{t('banner.dropsEmpty')}</p>
            ) : (
              <ol className="drops">
                {[...s.sDrops].reverse().map((d) => (
                  <li key={d.record.uid}>
                    <Portrait id={d.record.rewardId} name={d.record.name} rank={d.record.rank} />
                    <span className="drop-name">{d.record.name}</span>
                    <span className="drop-date muted">{fmtDate(d.record.time)}</span>
                    {rules.hardPity && (
                      <span className={'drop-pity' + (rules.softFrom && d.pity > rules.softFrom ? ' is-late' : '')}>{d.pity}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {rules.hardPity && s.sDrops.length > 0 && (
            <section>
              <PityHistogram drops={s.sDrops} max={rules.hardPity} soft={rules.softFrom} />
            </section>
          )}

          {banners.length > 0 && (
            <section>
              <h2>{t('banner.banners')}</h2>
              <p className="muted">{t('banner.bannersNote')}</p>
              <BannerList banners={banners} />
            </section>
          )}

          {s.rareDrops.length > 0 && (
            <section>
              <h2>{t('banner.rare')}</h2>
              <p className="muted">{t('banner.rareNote')}</p>
              <ol className="drops">
                {[...s.rareDrops].reverse().map((r) => (
                  <li key={r.uid}>
                    <Portrait id={r.rewardId} name={r.name} rank={r.rank} />
                    <span className="drop-name">{r.name}</span>
                    <span className="drop-date muted">{fmtDate(r.time)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
