import { useEffect, useMemo, useState } from 'react'
import { rollsUk } from '../lib/plural'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'

/** Generated daily by scripts/update-achievements.mjs; loaded only on this page. */
interface Achievement {
  id: string
  c: string
  t: string
  d: string
  h: 0 | 1
  q: 1 | 2 | 3
  a: number
  o?: string[]
  i?: string
}
interface AchievementData {
  categories: Record<string, { name: string; tape: string }>
  icons: string[]
  list: Achievement[]
}

const VIEW_KEY = 'hethereau-ledger.achView'
type Show = 'all' | 'todo' | 'done'
interface View {
  show: Show
  cat: string
  spoilers: boolean
}

const CAT_UK: Record<string, string> = {
  Explore: 'Дослідження',
  Fight: 'Бій',
  Quest: 'Завдання',
  Interest: 'Захоплення',
  Develop: 'Розвиток',
  Play: 'Ігровий процес',
  City: 'Місто',
  Social: 'Зв’язки',
}

const TEXT = {
  uk: {
    title: 'Досягнення',
    lead: 'Відмічайте отримані досягнення й дивіться, скільки Annulith ще можна забрати. Список оновлюється з файлів гри сам; назви й умови англійською, як у грі.',
    loading: 'Завантажую список…',
    progress: (d: number, t: number) => `${d} з ${t}`,
    left: (a: number) => `Ще можна забрати: ${a.toLocaleString('uk-UA')} Annulith`,
    leftPulls: (n: number) => `≈ ${rollsUk(n)}`,
    search: 'Пошук за назвою чи умовою',
    all: 'Усі',
    todo: 'Не отримані',
    done: 'Отримані',
    allCats: 'Усі розділи',
    spoilers: 'Показувати приховані',
    hidden: 'Приховане досягнення',
    hiddenHint: 'Умову видно після отримання або коли ввімкнено «Показувати приховані»',
    reward: (a: number) => `+${a} Annulith`,
    markAll: 'Відмітити всі в розділі',
    unmarkAll: 'Зняти всі в розділі',
    empty: 'Нічого не знайдено',
    perProfile: 'Досягнення зберігаються для активного профілю і синхронізуються через Google Drive.',
  },
  en: {
    title: 'Achievements',
    lead: 'Tick the achievements you have and see how much Annulith is still waiting. The list updates itself from the game files; names and conditions are in English, as in the game.',
    loading: 'Loading the list…',
    progress: (d: number, t: number) => `${d} of ${t}`,
    left: (a: number) => `Still to claim: ${a.toLocaleString('en-GB')} Annulith`,
    leftPulls: (n: number) => `≈ ${n} rolls`,
    search: 'Search by name or condition',
    all: 'All',
    todo: 'Missing',
    done: 'Obtained',
    allCats: 'All sections',
    spoilers: 'Show hidden ones',
    hidden: 'Hidden achievement',
    hiddenHint: 'The condition shows once you have it, or when Show hidden ones is on',
    reward: (a: number) => `+${a} Annulith`,
    markAll: 'Tick all in section',
    unmarkAll: 'Untick all in section',
    empty: 'Nothing found',
    perProfile: 'Achievements are kept for the active profile and sync through Google Drive.',
  },
}

function loadView(): View {
  try {
    return { show: 'all', cat: '', spoilers: false, ...JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}') }
  } catch {
    return { show: 'all', cat: '', spoilers: false }
  }
}

export function AchievementsPage() {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const { active, setAchievements } = useStore()
  const [data, setData] = useState<AchievementData | null>(null)
  const [q, setQ] = useState('')
  const [view, setView] = useState<View>(loadView)

  useEffect(() => {
    import('../data/achievements.json').then((m) => setData(m.default as unknown as AchievementData))
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(view))
    } catch {
      /* ignore */
    }
  }, [view])

  const done = useMemo(() => new Set(active.achievements ?? []), [active.achievements])
  const catName = (c: string) => (lang === 'uk' ? CAT_UK[c] : undefined) ?? data?.categories[c]?.name ?? c

  const summary = useMemo(() => {
    if (!data) return null
    const total = data.list.length
    const got = data.list.filter((a) => done.has(a.id)).length
    const left = data.list.filter((a) => !done.has(a.id)).reduce((s, a) => s + a.a, 0)
    const perCat = new Map<string, { got: number; total: number }>()
    for (const a of data.list) {
      const c = perCat.get(a.c) ?? { got: 0, total: 0 }
      c.total++
      if (done.has(a.id)) c.got++
      perCat.set(a.c, c)
    }
    return { total, got, left, perCat }
  }, [data, done])

  const shown = useMemo(() => {
    if (!data) return []
    const needle = q.trim().toLowerCase()
    return data.list.filter((a) => {
      if (view.cat && a.c !== view.cat) return false
      if (view.show === 'done' && !done.has(a.id)) return false
      if (view.show === 'todo' && done.has(a.id)) return false
      if (!needle) return true
      const secret = a.h && !done.has(a.id) && !view.spoilers
      return !secret && (a.t.toLowerCase().includes(needle) || a.d.toLowerCase().includes(needle))
    })
  }, [data, q, view, done])

  const groups = useMemo(() => {
    const m = new Map<string, Achievement[]>()
    for (const a of shown) m.set(a.c, [...(m.get(a.c) ?? []), a])
    return [...m.entries()]
  }, [shown])

  if (!data || !summary) return <p className="muted">{x.loading}</p>

  const pct = Math.round((summary.got / summary.total) * 100)

  return (
    <article className="ach">
      <h1>{x.title}</h1>
      <p className="lead">{x.lead}</p>

      <section className="ach-summary">
        <p className="ach-count">
          <strong>{x.progress(summary.got, summary.total)}</strong> <span className="muted">· {pct}%</span>
        </p>
        <div className="meter meter--teal" role="img" aria-label={`${pct}%`}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p>
          {x.left(summary.left)} <span className="muted">· {x.leftPulls(Math.floor(summary.left / 160))}</span>
        </p>
      </section>

      <div className="ach-controls">
        <input type="search" placeholder={x.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label={x.search} />
        <div className="seg" role="radiogroup">
          {(['all', 'todo', 'done'] as Show[]).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={view.show === s} className={view.show === s ? 'is-on' : ''} onClick={() => setView({ ...view, show: s })}>
              {x[s]}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={view.spoilers} onChange={(e) => setView({ ...view, spoilers: e.target.checked })} />
          <span>{x.spoilers}</span>
        </label>
      </div>

      <div className="ach-cats">
        <button type="button" className={'chip' + (view.cat === '' ? ' is-on' : '')} onClick={() => setView({ ...view, cat: '' })}>
          {x.allCats}
        </button>
        {Object.keys(data.categories).map((c) => {
          const s = summary.perCat.get(c)
          return (
            <button key={c} type="button" className={'chip' + (view.cat === c ? ' is-on' : '')} onClick={() => setView({ ...view, cat: c })}>
              {catName(c)} <span className="muted">{s ? `${s.got}/${s.total}` : ''}</span>
            </button>
          )
        })}
      </div>

      {groups.length === 0 && <p className="muted">{x.empty}</p>}

      {groups.map(([c, items]) => {
        const allDone = items.every((a) => done.has(a.id))
        return (
          <section key={c} className="ach-group">
            <div className="ach-group-head">
              <h2>
                {catName(c)} <span className="muted ach-tape">{data.categories[c]?.tape}</span>
              </h2>
              <button className="link-btn" onClick={() => setAchievements(items.map((a) => a.id), !allDone)}>
                {allDone ? x.unmarkAll : x.markAll}
              </button>
            </div>
            <ul className="ach-list">
              {items.map((a) => {
                const has = done.has(a.id)
                const secret = !!a.h && !has && !view.spoilers
                return (
                  <li key={a.id} className={'ach-item q' + a.q + (has ? ' is-done' : '')}>
                    <label>
                      <input type="checkbox" checked={has} onChange={(e) => setAchievements([a.id], e.target.checked)} />
                      {a.i && data.icons.includes(a.i) ? (
                        <img className="ach-icon" src={`${import.meta.env.BASE_URL}achievements/${a.i}.webp`} alt="" width={40} height={40} loading="lazy" />
                      ) : (
                        <span className="ach-icon" />
                      )}
                      <span className="ach-text">
                        <span className="ach-title">
                          {secret ? '???' : a.t}
                          {a.h ? <span className="tag">{x.hidden}</span> : null}
                        </span>
                        <span className="ach-desc muted">{secret ? x.hiddenHint : a.d}</span>
                      </span>
                      {a.a > 0 && <span className="ach-reward">{x.reward(a.a)}</span>}
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      <p className="note muted">{x.perProfile}</p>
    </article>
  )
}
