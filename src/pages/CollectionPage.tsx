import { useEffect, useMemo, useRef, useState } from 'react'
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

const copiesUk = (n: number) => {
  const a = n % 10
  const b = n % 100
  if (a === 1 && b !== 11) return `${n} копія`
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return `${n} копії`
  return `${n} копій`
}

const TEXT = {
  uk: {
    title: 'Колекція',
    lead: 'Персонажі з рівнем пробудження та скіни з лімітованих банерів. Усе рахується з історії круток і порогів 50/120/200. Те, чого історія не бачить (картки вибору, подарунки), можна виправити вручну: натисніть на персонажа чи скін.',
    chars: 'Персонажі',
    skins: 'Скіни',
    none: 'Немає',
    awaken: (l: number) => `Пробудження ${l}`,
    extra: (n: number) => `+${n} Mind Shard`,
    manualTag: 'вручну',
    edit: 'Змінити рівень пробудження',
    editTitle: 'Рівень пробудження',
    fromHistory: (n: number) => (n ? `В історії круток: ${copiesUk(n)}.` : 'В історії круток цього персонажа немає.'),
    levelHint: 'Пробудження 0 — персонаж без дублікатів. Кожен дублікат стає Mind Shard і дає +1 рівень, максимум 6.',
    reset: 'Як в історії',
    done: 'Готово',
    kinds: { outfit: 'Вбрання', car: 'Скін авто', glider: 'Глайдер' } as Record<Kind, string>,
    how: { history: 'з круток', milestone: 'за поріг', manual: 'вручну' },
    toggle: 'Натисніть, щоб позначити, є чи немає',
    filterAll: 'Усі',
    filterHave: 'Є',
    filterMissing: 'Немає',
  },
  en: {
    title: 'Collection',
    lead: 'Characters with their Awakening level, plus the skins from limited banners. Everything is counted from your pull history and the 50/120/200 milestones. Fix what history can’t see (selector cards, gifts) by hand: tap a character or a skin.',
    chars: 'Characters',
    skins: 'Skins',
    none: 'Not owned',
    awaken: (l: number) => `Awakening Lvl ${l}`,
    extra: (n: number) => `+${n} Mind Shard${n === 1 ? '' : 's'}`,
    manualTag: 'by hand',
    edit: 'Change Awakening level',
    editTitle: 'Awakening level',
    fromHistory: (n: number) => (n ? `Pull history: ${n} cop${n === 1 ? 'y' : 'ies'}.` : 'This character is not in your pull history.'),
    levelHint: 'Awakening Lvl 0 is the character with no duplicates. Each duplicate becomes a Mind Shard and adds one level, up to 6.',
    reset: 'Match history',
    done: 'Done',
    kinds: { outfit: 'Outfit', car: 'Livery', glider: 'Glider' } as Record<Kind, string>,
    how: { history: 'from pulls', milestone: 'milestone', manual: 'by hand' },
    toggle: 'Tap to mark as owned or not',
    filterAll: 'All',
    filterHave: 'Owned',
    filterMissing: 'Missing',
  },
}

const MAX_AWAKEN = 6
/** Awakening level from copies: the first copy is level 0, each duplicate adds one, up to 6. */
const levelOf = (copies: number) => (copies > 0 ? Math.min(copies - 1, MAX_AWAKEN) : -1)

function Pips({ level }: { level: number }) {
  return (
    <span className="pips" aria-hidden="true">
      {Array.from({ length: MAX_AWAKEN }, (_, i) => (
        <i key={i} className={i < level ? 'is-on' : ''} />
      ))}
    </span>
  )
}

export function CollectionPage() {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const { active, setCharacterManual, setSkin } = useStore()
  const [editing, setEditing] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
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

  const current = editing ? chars.find((c) => c.id === editing) : undefined
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (editing && !d.open) d.showModal?.()
    if (!editing && d.open) d.close()
  }, [editing])

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
            .map((c) => {
              const level = levelOf(c.total)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={'char-card' + (c.total > 0 ? ' is-owned' : '')}
                    aria-label={`${c.name}: ${level >= 0 ? x.awaken(level) : x.none}. ${x.edit}`}
                    onClick={() => setEditing(c.id)}
                  >
                    <Portrait id={c.id} name={c.name} rank={c.rank} size={64} />
                    <span className="char-name">{c.name}</span>
                    {level >= 0 ? (
                      <>
                        <Pips level={level} />
                        <span className="char-level">{x.awaken(level)}</span>
                      </>
                    ) : (
                      <span className="char-level muted">{x.none}</span>
                    )}
                    {(c.total > MAX_AWAKEN + 1 || c.manual !== 0) && (
                      <span className="char-extra muted">
                        {c.total > MAX_AWAKEN + 1 && x.extra(c.total - MAX_AWAKEN - 1)}
                        {c.total > MAX_AWAKEN + 1 && c.manual !== 0 && ' · '}
                        {c.manual !== 0 && x.manualTag}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
        </ul>
      )}

      <dialog ref={dialog} className="modal" aria-labelledby="awaken-title" onClose={() => setEditing(null)} onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
        {current && (
          <div className="modal-body">
            <div className="modal-head">
              <Portrait id={current.id} name={current.name} rank={current.rank} size={56} />
              <div>
                <h2 id="awaken-title">{current.name}</h2>
                <p className="muted">{x.editTitle}</p>
              </div>
            </div>
            <div className="level-grid" role="radiogroup" aria-label={x.editTitle}>
              {[-1, 0, 1, 2, 3, 4, 5, 6].map((l) => {
                const on = levelOf(current.total) === l
                return (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={'level' + (on ? ' is-on' : '') + (l < 0 ? ' is-none' : '')}
                    onClick={() => {
                      const target = l < 0 ? 0 : l === MAX_AWAKEN ? Math.max(MAX_AWAKEN + 1, current.total) : l + 1
                      setCharacterManual(current.id, target - current.fromHistory)
                    }}
                  >
                    {l < 0 ? x.none : l}
                  </button>
                )
              })}
            </div>
            <p className="small muted">
              {x.fromHistory(current.fromHistory)} {x.levelHint}
            </p>
            <div className="modal-actions">
              {current.manual !== 0 && (
                <button type="button" className="btn btn--ghost" onClick={() => setCharacterManual(current.id, 0)}>
                  {x.reset}
                </button>
              )}
              <button type="button" className="btn" onClick={() => setEditing(null)}>
                {x.done}
              </button>
            </div>
          </div>
        )}
      </dialog>

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
