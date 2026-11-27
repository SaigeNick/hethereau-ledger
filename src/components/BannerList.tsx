import { MILESTONES } from '../lib/bannerInfo'
import { lookup } from '../lib/dictionary'
import { useI18n } from '../lib/i18n'
import type { BannerStat } from '../lib/stats'
import { Portrait } from './Portrait'

const MAX = MILESTONES[MILESTONES.length - 1]

export function bannerName(b: BannerStat) {
  return (b.featuredId && lookup(b.featuredId)?.name) || b.banner.replace(/^Lottery_/, '')
}

/** Progress to the glider, livery and outfit on one banner. */
export function Milestones({ pulls, labelled }: { pulls: number; labelled?: boolean }) {
  const { t } = useI18n()
  const names = [t('ms.glider'), t('ms.livery'), t('ms.outfit')]
  const bar = (
    <div className="milestones" role="img" aria-label={t('banner.milestoneAria', { n: pulls })}>
      <span className="ms-fill" style={{ width: `${Math.min(100, (pulls / MAX) * 100)}%` }} />
      {MILESTONES.map((m) => (
        <span key={m} className={'ms-mark' + (pulls >= m ? ' is-done' : '')} style={{ left: `${(m / MAX) * 100}%` }}>
          {!labelled && <em>{m}</em>}
        </span>
      ))}
    </div>
  )
  if (!labelled) return bar
  return (
    <div className="ms-labelled">
      {bar}
      <ul className="ms-legend">
        {MILESTONES.map((m, i) => (
          <li key={m} className={pulls >= m ? 'is-done' : ''}>
            <strong>{m}</strong> {names[i]}
            {pulls < m && <span className="muted"> · {t('ms.left', { n: m - pulls })}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BannerList({ banners }: { banners: BannerStat[] }) {
  const { t, fmtDate } = useI18n()
  return (
    <ol className="banners">
      {banners.map((b) => {
        const name = bannerName(b)
        return (
          <li key={b.banner}>
            <Portrait id={b.featuredId ?? ''} name={name} rank="S" />
            <div className="banner-main">
              <span className="drop-name">{name}</span>
              <span className="drop-date muted">
                {fmtDate(b.firstTime)} – {fmtDate(b.lastTime)}
                {b.sDrops.length > 0 && ` · ${t('banner.gotS', { n: b.sDrops.length })}`}
              </span>
              <Milestones pulls={b.pulls} />
            </div>
            <span className="drop-pity">{b.pulls}</span>
          </li>
        )
      })}
    </ol>
  )
}
