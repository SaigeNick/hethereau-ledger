import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { contribute, fetchAggregate, luckierThan, summarize, type Aggregate } from '../lib/globalStats'
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

  useEffect(() => {
    let alive = true
    contribute(profile).finally(() => fetchAggregate().then((a) => alive && setAgg(a)))
    return () => {
      alive = false
    }
  }, [profile])

  if (!agg || !mine) return null
  const myAvg = mine.pities.length ? Math.round((mine.pities.reduce((a, b) => a + b, 0) / mine.pities.length) * 10) / 10 : null
  const theirAvg = agg.sCount ? agg.hist.reduce((a, n, i) => a + n * (i + 1), 0) / agg.sCount : null
  const share = myAvg !== null ? luckierThan(agg.avgs, myAvg) : null
  const enough = agg.players >= MIN_PLAYERS
  const pct = share !== null ? Math.round(share * 100) : null

  return (
    <section className="global-card" aria-label={x.title}>
      <p className="muted global-title">{x.title}</p>
      <p className="global-head">
        {myAvg === null
          ? x.noS
          : !enough || pct === null
            ? x.few(agg.players)
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
          <dd>{agg.players.toLocaleString(lang === 'uk' ? 'uk-UA' : 'en-GB')}</dd>
        </div>
      </dl>
      <p className="muted global-foot">
        {x.foot} <Link to="/privacy">{x.off}</Link>
      </p>
    </section>
  )
}
