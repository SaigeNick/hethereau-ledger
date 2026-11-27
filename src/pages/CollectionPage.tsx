import { useMemo, useState } from 'react'
import { Portrait } from '../components/Portrait'
import collection from '../data/collection.json'
import { FEATURED } from '../lib/bannerInfo'
import { lookup, resolveAll } from '../lib/dictionary'
import { useI18n } from '../lib/i18n'
import { bannerStats } from '../lib/stats'
import { useStore } from '../lib/store'
import { POOL_IDS } from '../lib/types'

/**
 * Characters with their copies and the limited banners' skins, owned or not.
 * Built from pull history and banner milestones, with hand corrections on top
 * for what history can't see (selector cards, gifts, the first free copies).
 */
type Kind = 'outfit' | 'car' | 'glider'
const MILESTONE: Record<Kind, number> = { glider: 50, car: 120, outfit: 200 }

const TEXT = {
  uk: {
    title: 'Колекція',
    lead: 'Які персонажі є і скільки в них копій, а також скіни з лімітованих банерів. Рахується з історії круток і порогів 50/120/200; що історія не бачить (картки вибору, подарунки), додайте вручну.',
    chars: 'Персонажі',
    skins: 'Скіни',
    owned: (n: number, t: number) => `Є ${n} з ${t}`,
    none: 'Немає',
    copies: (n: number) => (n === 1 ? '1 копія' : n >= 2 && n <= 4 ? `${n} копії` : `${n} копій`),
    dupes: (n: number) => `+${n} дубл${n === 1 ? 'ь' : n <= 4 ? 'і' : 'ів'}`,
    plus: 'Додати копію',
    minus: 'Прибрати копію',
    manual: (n: number) => `вручну ${n > 0 ? '+' : ''}${n}`,
    kinds: { outfit: 'Вбрання', car: 'Скін авто', glider: 'Глайдер' } as Record<Kind, string>,
    how: { history: 'з круток', milestone: 'за поріг', manual: 'вручну' },
    toggle: 'Натисніть, щоб змінити',
    filterAll: 'Усі',
    filterHave: 'Є',
    filterMissing: 'Немає',
  },
  en: {
    title: 'Collection',
    lead: 'Which characters you have and how many copies, plus the skins from limited banners. Counted from pull history and the 50/120/200 milestones; add what history can’t see (selector cards, gifts) by hand.',
    chars: 'Characters',
    skins: 'Skins',
    owned: (n: number, t: number) => `${n} of ${t} owned`,
    none: 'Not owned',
    copies: (n: number) => `${n} cop${n === 1 ? 'y' : 'ies'}`,
    dupes: (n: number) => `+${n} dupe${n === 1 ? '' : 's'}`,
    plus: 'Add a copy',
    minus: 'Remove a copy',
    manual: (n: number) => `by hand ${n > 0 ? '+' : ''}${n}`,
    kinds: { outfit: 'Outfit', car: 'Car skin', glider: 'Glider' } as Record<Kind, string>,
    how: { history: 'from pulls', milestone: 'milestone', manual: 'by hand' },
    toggle: 'Tap to change',
    filterAll: 'All',
    filterHave: 'Owned',
    filterMissing: 'Missing',
  },
}

export function CollectionPage() {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const { active, adjustCharacter, setSkin } = useStore()
  const [tab, setTab] = useState<'chars' | 'skins'>('chars')
  const [filter, setFilter] = useState<'all' | 'have' | 'missing'>('all')

  const all = useMemo(() => POOL_IDS.flatMap((p) => resolveAll(active.records[p])), [active.records])

  const chars = useMemo(() => {
    const seen = new Map<string, number>()
    for (const r of all) if (r.rewardType === 'character') seen.set(r.rewardId, (seen.get(r.rewardId) ?? 0) + 1)
    return collection.characters
      .map((id) => {
        const fromHistory = seen.get(id) ?? 0
        const manual = active.collection?.chars?.[id] ?? 0
        const r = lookup(id)
        return { id, name: r?.name ?? id, rank: (r?.rank ?? 'S') as 'S' | 'A', fromHistory, manual, total: Math.max(0, fromHistory + manual) }
      })
      .sort((a, b) => (a.rank !== b.rank ? (a.rank === 'S' ? -1 : 1) : b.total - a.total || a.name.localeCompare(b.name)))
  }, [all, active.collection])

  const skins = useMemo(() => {
    const got = new Set(all.map((r) => r.rewardId.toLowerCase()))
    const pullsByChar = new Map<string, number>()
    for (const b of bannerStats(resolveAll(active.records.Lottery_LimitedCharacter), FEATURED)) {
      if (b.featuredId) pullsByChar.set(b.featuredId, (pullsByChar.get(b.featuredId) ?? 0) + b.pulls)
    }
    const carsPerChar = new Map<string, number>()
    for (const s of collection.skins) if (s.kind === 'car') carsPerChar.set(s.char, (carsPerChar.get(s.char) ?? 0) + 1)
    const groups = new Map<string, { id: string; kind: Kind; owned: boolean; how: keyof typeof x.how | null }[]>()
    for (const s of collection.skins) {
      const kind = s.kind as Kind
      const manual = active.collection?.skins?.[s.id]
      // With two car skins on one banner we can't tell which one the milestone gives.
      const milestone = (pullsByChar.get(s.char) ?? 0) >= MILESTONE[kind] && !(kind === 'car' && (carsPerChar.get(s.char) ?? 0) > 1)
      const auto = got.has(s.id) ? 'history' : milestone ? 'milestone' : null
      const owned = manual ?? !!auto
      const how = manual !== undefined ? 'manual' : auto
      groups.set(s.char, [...(groups.get(s.char) ?? []), { id: s.id, kind, owned, how: owned ? how : null }])
    }
    return [...groups.entries()].map(([char, items]) => ({ char, name: lookup(char)?.name ?? char, items }))
  }, [all, active.records.Lottery_LimitedCharacter, active.collection, x.how])

  const ownedChars = chars.filter((c) => c.total > 0).length
  const skinTotal = skins.reduce((a, g) => a + g.items.length, 0)
  const skinOwned = skins.reduce((a, g) => a + g.items.filter((i) => i.owned).length, 0)

  const keep = (owned: boolean) => filter === 'all' || (filter === 'have') === owned

  return (
    <article className="collection">
      <h1>{x.title}</h1>
      <p className="lead">{x.lead}</p>

      <div className="collection-bar">
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'chars'} className={tab === 'chars' ? 'is-on' : ''} onClick={() => setTab('chars')}>
            {x.chars} <span className="muted">{ownedChars}/{chars.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'skins'} className={tab === 'skins' ? 'is-on' : ''} onClick={() => setTab('skins')}>
            {x.skins} <span className="muted">{skinOwned}/{skinTotal}</span>
          </button>
        </div>
        <div className="seg" role="radiogroup">
          {(['all', 'have', 'missing'] as const).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={filter === f} className={filter === f ? 'is-on' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? x.filterAll : f === 'have' ? x.filterHave : x.filterMissing}
            </button>
          ))}
        </div>
      </div>

      {tab === 'chars' && (
        <ul className="char-grid">
          {chars
            .filter((c) => keep(c.total > 0))
            .map((c) => (
              <li key={c.id} className={'char-card' + (c.total > 0 ? ' is-owned' : '')}>
                <Portrait id={c.id} name={c.name} rank={c.rank} size={72} />
                <p className="char-name">{c.name}</p>
                <p className="char-copies">
                  {c.total > 0 ? (
                    <>
                      <strong>{x.copies(c.total)}</strong>
                      {c.total > 1 && <span className="muted"> · {x.dupes(c.total - 1)}</span>}
                    </>
                  ) : (
                    <span className="muted">{x.none}</span>
                  )}
                </p>
                {c.manual !== 0 && <p className="muted small">{x.manual(c.manual)}</p>}
                <div className="stepper">
                  <button type="button" aria-label={`${x.minus}: ${c.name}`} disabled={c.total === 0} onClick={() => adjustCharacter(c.id, -1)}>
                    −
                  </button>
                  <button type="button" aria-label={`${x.plus}: ${c.name}`} onClick={() => adjustCharacter(c.id, 1)}>
                    +
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}

      {tab === 'skins' && (
        <div className="skin-groups">
          {skins.map((g) => {
            const items = g.items.filter((i) => keep(i.owned))
            if (!items.length) return null
            return (
              <section key={g.char} className="skin-group">
                <h2>
                  <Portrait id={g.char} name={g.name} rank="S" size={32} /> {g.name}
                </h2>
                <ul className="skin-row">
                  {items.map((i) => {
                    const r = lookup(i.id)
                    return (
                      <li key={i.id}>
                        <button
                          type="button"
                          className={'skin-tile' + (i.owned ? ' is-owned' : '')}
                          aria-pressed={i.owned}
                          title={x.toggle}
                          onClick={() => setSkin(i.id, !i.owned)}
                        >
                          <Portrait id={i.id} name={r?.name ?? i.id} rank="A" size={64} />
                          <span className="skin-kind muted">{x.kinds[i.kind]}</span>
                          <span className="skin-name">{r?.name.replace(/ - Livery$/, '') ?? i.id}</span>
                          <span className="skin-how">{i.owned ? (i.how ? x.how[i.how] : '✓') : x.none}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </article>
  )
}
