import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isBonus, RULES } from '../lib/banners'
import { resolveAll } from '../lib/dictionary'
import { useI18n } from '../lib/i18n'
import { sortChrono } from '../lib/importer'
import { FEATURED, MILESTONES } from '../lib/bannerInfo'
import { lookup } from '../lib/dictionary'
import { bannerStats, computeStats, type PoolStats } from '../lib/stats'
import { POOL_IDS, type PoolId, type PoolRecords, type PullRecord } from '../lib/types'
import { BoardLegend, PityBoard } from './PityBoard'
import { PityHistogram } from './PityHistogram'
import { Portrait } from './Portrait'

export function hasAnyRecords(records: PoolRecords) {
  return POOL_IDS.some((p) => records[p].length > 0)
}

function LuckText({ s }: { s: PoolStats }) {
  const { t } = useI18n()
  if (s.luck === null) return <span className="muted">{t('luck.none')}</span>
  const pct = Math.round((s.luck - 1) * 100)
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

export function OverviewBody({ records, base }: { records: PoolRecords; base: string }) {
  const { t } = useI18n()
  const stats = useMemo(() => POOL_IDS.map((p) => computeStats(p, resolveAll(records[p]))), [records])
  return (
    <div className="overview">
      {stats.map((s) => {
        const rules = RULES[s.pool]
        const last = s.sDrops[s.sDrops.length - 1]
        const empty = records[s.pool].length === 0
        return (
          <section key={s.pool} className={'pool-row' + (empty ? ' is-empty' : '')}>
            <header>
              <h2>
                <Link to={`${base}/pool/${s.pool}`}>{t(`pool.${s.pool}` as never)}</Link>
              </h2>
              {empty ? (
                <p className="muted">{t('overview.noData')}</p>
              ) : (
                <p className="muted">
                  {last ? t('overview.lastS', { name: last.record.name, n: last.pity }) : t('overview.noS')}
                </p>
              )}
            </header>
            {rules.hardPity ? (
              <div className="pool-pity">
                <p className="pity-number">
                  <strong>{s.currentPity}</strong>
                  <span>{t('stat.pityOf', { n: rules.hardPity })}</span>
                </p>
                <PityBoard current={s.currentPity} max={rules.hardPity} soft={rules.softFrom} cols={{ wide: 30, narrow: 30 }} compact />
              </div>
            ) : (
              <div className="pool-pity">
                <p className="pity-number">
                  <strong>{s.totalPulls}</strong>
                  <span>{t('stat.total').toLowerCase()}</span>
                </p>
              </div>
            )}
            {!empty && (
              <Link className="row-link" to={`${base}/pool/${s.pool}`}>
                {t('overview.open', { pool: t(`pool.${s.pool}` as never) })}
              </Link>
            )}
          </section>
        )
      })}
    </div>
  )
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
  const [filter, setFilter] = useState<'all' | 'top' | 'bonus'>('all')
  const [limit, setLimit] = useState(50)

  // Pity at each row, newest first, for the history table.
  const rows = useMemo(() => {
    let counter = 0
    const out: { r: PullRecord; pity: number | null }[] = []
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
        : rows.filter((x) => !isBonus(x.r) && (x.r.rank === 'S' || x.r.rank === 'A'))
  const hasBonus = rows.some((x) => isBonus(x.r))
  const banners = useMemo(() => (pool === 'Lottery_LimitedCharacter' ? bannerStats(records, FEATURED) : []), [pool, records])

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

      {banners.length > 0 && (
        <section>
          <h2>{t('banner.banners')}</h2>
          <p className="muted">{t('banner.bannersNote')}</p>
          <ol className="banners">
            {banners.map((b) => {
              const f = b.featuredId ? lookup(b.featuredId) : null
              const name = f?.name ?? b.banner.replace(/^Lottery_/, '')
              return (
                <li key={b.banner}>
                  <Portrait id={b.featuredId ?? ''} name={name} rank="S" />
                  <div className="banner-main">
                    <span className="drop-name">{name}</span>
                    <span className="drop-date muted">
                      {fmtDate(b.firstTime)} – {fmtDate(b.lastTime)}
                      {b.sDrops.length > 0 && ` · ${t('banner.gotS', { n: b.sDrops.length })}`}
                    </span>
                    <div className="milestones" role="img" aria-label={t('banner.milestoneAria', { n: b.pulls })}>
                      <span className="ms-fill" style={{ width: `${Math.min(100, (b.pulls / 200) * 100)}%` }} />
                      {MILESTONES.map((m) => (
                        <span key={m} className={'ms-mark' + (b.pulls >= m ? ' is-done' : '')} style={{ left: `${(m / 200) * 100}%` }}>
                          <em>{m}</em>
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="drop-pity">{b.pulls}</span>
                </li>
              )
            })}
          </ol>
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

      {rules.hardPity && s.sDrops.length > 0 && (
        <section>
          <PityHistogram drops={s.sDrops} max={rules.hardPity} soft={rules.softFrom} />
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>{t('banner.history')}</h2>
          <div className="seg" role="group">
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
        </div>
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
                <tr
                  key={r.uid}
                  className={isBonus(r) ? 'row-bonus' : r.rewardType === 'item' || r.rank === '?' ? 'row-plain' : `row-${r.rank}`}
                >
                  <td className="muted nowrap">{r.time.slice(0, 16)}</td>
                  <td>
                    {r.name}
                    {r.qty && r.qty > 1 ? <span className="muted"> ×{r.qty}</span> : null}
                    {r.manual && <span className="tag">{t('banner.manualTag')}</span>}
                    {(r.kind === 'points_gift' || r.kind === 'chase_reward') && (
                      <span className="tag">{t(`banner.bonus.${r.kind}` as never)}</span>
                    )}
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
        {shown.length > limit && (
          <button className="btn btn--ghost" onClick={() => setLimit((l) => l + 100)}>
            {t('banner.more')}
          </button>
        )}
      </section>
    </div>
  )
}
