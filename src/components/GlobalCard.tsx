import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { contribute, fetchAggregate, luckierThan, summarize, type Aggregate, type Totals } from '../lib/globalStats'
import { REGION_NAMES, REGIONS, type Region } from '../lib/regions'
import { useI18n } from '../lib/i18n'
import type { Profile } from '../lib/types'

const MIN_PLAYERS = 10

const TEXT = {
  uk: {
    title: 'Серед гравців',
    luckier: (p: number) => `Вам щастить більше, ніж ${p}% гравців`,
    unluckier: (p: number) => `${p}% гравців щастить більше, ніж вам`,
    noS: 'Отримайте першого S-персонажа, і тут з’явиться ваше місце серед гравців',
    few: (n: number) => `Поки замало даних для порівняння: ${n} з ${MIN_PLAYERS} гравців`,
    all: 'Усі',
    regionAria: 'Регіон',
    setRegion: 'Виберіть регіон у профілі, щоб порівнювати себе з гравцями свого сервера.',
    setRegionLink: 'Вибрати',
    yours: 'Ваш середній гарант S',
    theirs: 'Середній у спільноти',
    players: 'Гравців',
    foot: 'Лімітовані банери. Анонімно: на сервер ідуть лише числа.',
    off: 'Докладніше',
  },
  en: {
    title: 'Among players',
    luckier: (p: number) => `You’re luckier than ${p}% of players`,
    unluckier: (p: number) => `${p}% of players are luckier than you`,
    noS: 'Get your first S to see where you stand among players',
    few: (n: number) => `Not enough data to compare yet: ${n} of ${MIN_PLAYERS} players`,
    all: 'All',
    regionAria: 'Region',
    setRegion: 'Set your region in the profile to compare yourself with players on your server.',
    setRegionLink: 'Set it',
    yours: 'Your average S pity',
    theirs: 'Community average',
    players: 'Players',
    foot: 'Limited banners. Anonymous: only numbers are sent.',
    off: 'Details',
  },
}

export function GlobalCard({ profile }: { profile: Profile }) {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const [agg, setAgg] = useState<Aggregate | null>(null)
  const mine = useMemo(() => summarize(profile), [profile])
  const [picked, setPicked] = useState<Region | 'all' | null>(null)

  useEffect(() => {
    let alive = true
    contribute(profile).finally(() => fetchAggregate().then((a) => alive && setAgg(a)))
    return () => {
      alive = false
    }
  }, [profile])

  if (!agg || !mine) return null
  // Start on the player's own region when it has enough players, otherwise on everyone.
  const own = mine.region && (agg.regions?.[mine.region]?.players ?? 0) >= MIN_PLAYERS ? mine.region : 'all'
  const sel = picked ?? own
  const data: Totals = sel === 'all' ? agg : (agg.regions?.[sel] ?? { players: 0, pulls: 0, sCount: 0, hist: Array(90).fill(0), avgs: [] })
  const myAvg = mine.pities.length ? Math.round((mine.pities.reduce((a, b) => a + b, 0) / mine.pities.length) * 10) / 10 : null
  const theirAvg = data.sCount ? data.hist.reduce((a, n, i) => a + n * (i + 1), 0) / data.sCount : null
  const share = myAvg !== null ? luckierThan(data.avgs, myAvg) : null
  const enough = data.players >= MIN_PLAYERS
  const pct = share !== null ? Math.round(share * 100) : null

  return (
    <section className="global-card" aria-label={x.title}>
      <div className="global-top">
        <p className="muted global-title">{x.title}</p>
        {agg.regions && (
          <div className="seg seg--sm" role="radiogroup" aria-label={x.regionAria}>
            {(['all', ...REGIONS] as const).map((r) => (
              <button key={r} type="button" role="radio" aria-checked={sel === r} className={sel === r ? 'is-on' : ''} onClick={() => setPicked(r)} title={r === 'all' ? undefined : REGION_NAMES[lang][r]}>
                {r === 'all' ? x.all : r}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="global-head">
        {myAvg === null
          ? x.noS
          : !enough || pct === null
            ? x.few(data.players)
            : pct >= 50
              ? x.luckier(pct)
              : x.unluckier(100 - pct)}
      </p>
      <dl className="global-nums">
        {myAvg !== null && (
          <div>
            <dt>{x.yours}</dt>
            <dd>{myAvg.toFixed(1)}</dd>
          </div>
        )}
        {theirAvg !== null && (
          <div>
            <dt>{x.theirs}</dt>
            <dd>{theirAvg.toFixed(1)}</dd>
          </div>
        )}
        <div>
          <dt>{x.players}</dt>
          <dd>{data.players.toLocaleString(lang === 'uk' ? 'uk-UA' : 'en-GB')}</dd>
        </div>
      </dl>
      <p className="muted global-foot">
        {x.foot} <Link to="/privacy">{x.off}</Link>
      </p>
      {!mine.region && (
        <p className="muted global-foot">
          {x.setRegion} <Link to="/profile">{x.setRegionLink}</Link>
        </p>
      )}
    </section>
  )
}
