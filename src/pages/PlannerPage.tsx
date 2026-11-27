import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveAll } from '../lib/dictionary'
import { useI18n } from '../lib/i18n'
import { ARC_FEATURED } from '../data/arcBanners'
import { sortChrono } from '../lib/importer'
import { ANNULITH_PER_ROLL, arcPlan, plan } from '../lib/planner'
import type { PullRecord } from '../lib/types'
import { computeStats } from '../lib/stats'
import { useStore } from '../lib/store'

const KEY = 'hethereau-ledger.planner'
interface Saved {
  annulith: string
  dice: string
  daily: string
  days: string
  copies: number
  pity: string
}
const EMPTY: Saved = { annulith: '', dice: '', daily: '', days: '', copies: 1, pity: '' }

function load(): Saved {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return EMPTY
  }
}
const num = (s: string) => {
  const n = Number(s.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Ukrainian plural for "кидок". */
function rollsUk(n: number) {
  const a = n % 10
  const b = n % 100
  if (a === 1 && b !== 11) return `${n} кидок`
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return `${n} кидки`
  return `${n} кидків`
}

const TEXT = {
  uk: {
    title: 'Калькулятор круток',
    lead: 'Порахуй, чи вистачить ресурсів забрати персонажа з лімітованого банера. На дошках персонажів немає 50/50, тож кожна S — це персонаж банера.',
    pity: 'Поточний гарант',
    pityHint: (n: number) => `З твоєї історії: ${n}`,
    pityNone: 'Круток від останньої S',
    annulith: 'Annulith зараз',
    dice: 'Лімітовані кубики',
    daily: 'Annulith на день (необов’язково)',
    days: 'Днів до кінця банера',
    copies: 'Скільки копій',
    copy: (n: number) => (n === 1 ? 'Персонаж' : `+${n - 1} дубл${n === 2 ? 'ь' : 'і'}`),
    chance: (c: number) => (c === 1 ? 'Шанс забрати персонажа' : `Шанс отримати ${c} копії`),
    rolls: (n: number) => `Вистачить на ${rollsUk(n)}`,
    guaranteed: 'Гарантовано — ресурсів вистачає до жорсткого гаранту.',
    missing: (r: number, a: number) => `До гаранту бракує ${rollsUk(r)} — це ≈ ${a.toLocaleString('uk-UA')} Annulith.`,
    half: (r: number) => `Для шансу 50% потрібно ${rollsUk(r)}.`,
    note: `Один кидок — ${ANNULITH_PER_ROLL} Annulith. Шанси: 0,99% на кидок до 70-го, 19,59% з 71-го, 90-й гарантований (дані спільноти, не офіційні). Бонусні нагороди кожні 10 кидків не враховуються.`,
    more: 'Як працює гача',
  },
  en: {
    title: 'Pull planner',
    lead: 'Work out whether your resources are enough to get the character from the limited banner. Character boards have no 50/50, so every S is the banner character.',
    pity: 'Current pity',
    pityHint: (n: number) => `From your history: ${n}`,
    pityNone: 'Rolls since your last S',
    annulith: 'Annulith now',
    dice: 'Limited dice',
    daily: 'Annulith per day (optional)',
    days: 'Days until the banner ends',
    copies: 'How many copies',
    copy: (n: number) => (n === 1 ? 'Character' : `+${n - 1} dupe${n > 2 ? 's' : ''}`),
    chance: (c: number) => (c === 1 ? 'Chance to get the character' : `Chance to get ${c} copies`),
    rolls: (n: number) => `Enough for ${n} roll${n === 1 ? '' : 's'}`,
    guaranteed: 'Guaranteed: you have enough to reach hard pity.',
    missing: (r: number, a: number) => `You are ${r} rolls short of guaranteed, about ${a.toLocaleString('en-GB')} Annulith.`,
    half: (r: number) => `A 50% chance takes ${r} rolls.`,
    note: `One roll costs ${ANNULITH_PER_ROLL} Annulith. Rates: 0.99% per roll up to 70, 19.59% from 71, roll 90 guaranteed (community data, not official). Bonus rewards every 10 rolls are not counted.`,
    more: 'How the gacha works',
  },
}

function CharacterPlanner() {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const { active } = useStore()
  const historyPity = useMemo(() => {
    const recs = active.records.Lottery_LimitedCharacter
    return recs.length ? computeStats('Lottery_LimitedCharacter', resolveAll(recs)).currentPity : null
  }, [active])

  const [v, setV] = useState<Saved>(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v))
    } catch {
      /* storage full or blocked: the planner still works */
    }
  }, [v])
  const set = (k: keyof Saved) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })

  const pity = v.pity !== '' ? Math.min(89, Math.floor(num(v.pity))) : historyPity ?? 0
  const r = plan({
    pity,
    annulith: num(v.annulith),
    dice: num(v.dice),
    dailyAnnulith: num(v.daily),
    days: num(v.days),
    copies: v.copies,
  })
  const pct = r.chance >= 0.9995 ? 100 : r.chance * 100
  const pctText = pct >= 100 ? '100%' : pct < 0.1 && pct > 0 ? '<0.1%' : `${pct.toFixed(pct < 10 ? 1 : 0)}%`

  return (
    <>
      <p className="lead">{x.lead}</p>
      <div className="planner-grid">
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <label>
            <span>{x.pity}</span>
            <input inputMode="numeric" value={v.pity} placeholder={String(historyPity ?? 0)} onChange={set('pity')} />
            <small className="muted">{historyPity !== null ? x.pityHint(historyPity) : x.pityNone}</small>
          </label>
          <div className="form-row">
            <label>
              <span>{x.annulith}</span>
              <input inputMode="numeric" value={v.annulith} placeholder="0" onChange={set('annulith')} />
            </label>
            <label>
              <span>{x.dice}</span>
              <input inputMode="numeric" value={v.dice} placeholder="0" onChange={set('dice')} />
            </label>
          </div>
          <div className="form-row">
            <label>
              <span>{x.daily}</span>
              <input inputMode="numeric" value={v.daily} placeholder="0" onChange={set('daily')} />
            </label>
            <label>
              <span>{x.days}</span>
              <input inputMode="numeric" value={v.days} placeholder="0" onChange={set('days')} />
            </label>
          </div>
          <fieldset className="copies">
            <legend>{x.copies}</legend>
            <div className="seg" role="radiogroup">
              {[1, 2, 3, 4].map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={v.copies === c}
                  className={v.copies === c ? 'is-on' : ''}
                  onClick={() => setV({ ...v, copies: c })}
                >
                  {x.copy(c)}
                </button>
              ))}
            </div>
          </fieldset>
        </form>

        <section className="planner-result" aria-live="polite">
          <p className="muted">{x.chance(v.copies)}</p>
          <p className="planner-pct">{pctText}</p>
          <div className="meter" role="img" aria-label={pctText}>
            <span style={{ width: `${Math.max(pct, r.chance > 0 ? 1 : 0)}%` }} />
          </div>
          <p>{x.rolls(r.rolls)}</p>
          <p>{r.missingRolls ? x.missing(r.missingRolls, r.missingAnnulith) : x.guaranteed}</p>
          {r.missingRolls > 0 && <p className="muted">{x.half(r.forHalf)}</p>}
        </section>
      </div>
      <p className="note muted">
        {x.note} <Link to="/guide">{x.more}</Link>
      </p>
    </>
  )
}

/* ---------------- Arc ---------------- */

/** Pulls since the last S Arc and since the last featured one, oldest first. */
export function arcCounters(records: PullRecord[]) {
  let sinceS = 0
  let sinceF = 0
  for (const r of sortChrono(resolveAll(records))) {
    sinceS++
    sinceF++
    if (r.rank === 'S') {
      sinceS = 0
      if (r.banner && ARC_FEATURED[r.banner] === r.rewardId) sinceF = 0
    }
  }
  return { sinceS, sinceF }
}

const ARC_KEY = 'hethereau-ledger.plannerArc'
interface ArcSaved {
  pulls: string
  copies: number
  sinceS: string
  sinceF: string
}
const ARC_EMPTY: ArcSaved = { pulls: '', copies: 1, sinceS: '', sinceF: '' }

const ARC_TEXT = {
  uk: {
    lead: 'Шанс забрати арку банера. S-арка гарантована за 60 кидків, арка банера — за 80, і гарант переходить між банерами. Кидки йдуть лише по 10.',
    sinceS: 'Кидків від останньої S-арки',
    sinceF: 'Кидків від останньої арки банера',
    fromHistory: (n: number) => `З твоєї історії: ${n}`,
    noHistory: 'Імпортуй історію Arc, і число підставиться саме',
    pulls: 'Скільки Arc-кидків можеш зробити',
    pullsHint: 'Рахуються десятками: 37 → 30',
    copies: 'Скільки копій',
    copy: (n: number) => (n === 1 ? 'Арка' : `+${n - 1} коп${n === 2 ? 'ія' : 'ії'}`),
    chance: (c: number) => (c === 1 ? 'Шанс забрати арку банера' : `Шанс отримати ${c} копії`),
    rolls: (n: number) => `Рахуємо ${n} кидків`,
    guaranteed: 'Гарантовано: вистачає до гаранту арки банера.',
    missing: (n: number) => `До гаранту бракує ${n} кидків.`,
    half: (n: number) => `Для шансу 50% потрібно ${n} кидків.`,
    note: 'Шанси: 3% на S-арку за кидок, 25% із них — арка банера. Гра не публікує, як саме росте шанс ближче до гаранту, тому розрахунок трохи обережніший за реальність.',
  },
  en: {
    lead: 'Chance to get the featured Arc. An S Arc is guaranteed within 60 pulls and the featured Arc within 80, and pity carries over between banners. Pulls come in tens.',
    sinceS: 'Pulls since your last S Arc',
    sinceF: 'Pulls since your last featured Arc',
    fromHistory: (n: number) => `From your history: ${n}`,
    noHistory: 'Import your Arc history and this fills itself in',
    pulls: 'Arc pulls you can make',
    pullsHint: 'Counted in tens: 37 → 30',
    copies: 'How many copies',
    copy: (n: number) => (n === 1 ? 'Arc' : `+${n - 1} cop${n === 2 ? 'y' : 'ies'}`),
    chance: (c: number) => (c === 1 ? 'Chance to get the featured Arc' : `Chance to get ${c} copies`),
    rolls: (n: number) => `Counting ${n} pulls`,
    guaranteed: 'Guaranteed: you reach the featured Arc pity.',
    missing: (n: number) => `${n} pulls short of guaranteed.`,
    half: (n: number) => `A 50% chance takes ${n} pulls.`,
    note: 'Rates: 3% for an S Arc per pull, 25% of those are the featured Arc. The game does not publish how the rate rises near pity, so this estimate is slightly cautious.',
  },
}

function ArcPlanner() {
  const { lang } = useI18n()
  const x = ARC_TEXT[lang]
  const shared = TEXT[lang]
  const { active } = useStore()
  const hist = useMemo(() => {
    const recs = active.records.Arc_MiracleBox
    return recs.length ? arcCounters(recs) : null
  }, [active])
  const [v, setV] = useState<ArcSaved>(() => {
    try {
      return { ...ARC_EMPTY, ...JSON.parse(localStorage.getItem(ARC_KEY) ?? '{}') }
    } catch {
      return ARC_EMPTY
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(ARC_KEY, JSON.stringify(v))
    } catch {
      /* ignore */
    }
  }, [v])
  const set = (k: keyof ArcSaved) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  const sinceS = v.sinceS !== '' ? Math.min(59, Math.floor(num(v.sinceS))) : hist?.sinceS ?? 0
  const sinceF = v.sinceF !== '' ? Math.min(79, Math.floor(num(v.sinceF))) : hist?.sinceF ?? 0
  const r = arcPlan({ sinceS: Math.min(sinceS, sinceF), sinceF, pulls: num(v.pulls), copies: v.copies })
  const pct = r.chance >= 0.9995 ? 100 : r.chance * 100
  const pctText = pct >= 100 ? '100%' : pct < 0.1 && pct > 0 ? '<0.1%' : `${pct.toFixed(pct < 10 ? 1 : 0)}%`
  return (
    <>
      <p className="lead">{x.lead}</p>
      <div className="planner-grid">
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <div className="form-row">
            <label>
              <span>{x.sinceS}</span>
              <input inputMode="numeric" value={v.sinceS} placeholder={String(hist?.sinceS ?? 0)} onChange={set('sinceS')} />
            </label>
            <label>
              <span>{x.sinceF}</span>
              <input inputMode="numeric" value={v.sinceF} placeholder={String(hist?.sinceF ?? 0)} onChange={set('sinceF')} />
            </label>
          </div>
          <small className="muted">{hist ? x.fromHistory(hist.sinceF) : x.noHistory}</small>
          <label>
            <span>{x.pulls}</span>
            <input inputMode="numeric" value={v.pulls} placeholder="0" onChange={set('pulls')} />
            <small className="muted">{x.pullsHint}</small>
          </label>
          <fieldset className="copies">
            <legend>{x.copies}</legend>
            <div className="seg" role="radiogroup">
              {[1, 2, 3].map((c) => (
                <button key={c} type="button" role="radio" aria-checked={v.copies === c} className={v.copies === c ? 'is-on' : ''} onClick={() => setV({ ...v, copies: c })}>
                  {x.copy(c)}
                </button>
              ))}
            </div>
          </fieldset>
        </form>
        <section className="planner-result" aria-live="polite">
          <p className="muted">{x.chance(v.copies)}</p>
          <p className="planner-pct">{pctText}</p>
          <div className="meter" role="img" aria-label={pctText}>
            <span style={{ width: `${Math.max(pct, r.chance > 0 ? 1 : 0)}%` }} />
          </div>
          <p>{x.rolls(r.rolls)}</p>
          <p>{r.missing ? x.missing(r.missing) : x.guaranteed}</p>
          {r.missing > 0 && <p className="muted">{x.half(r.forHalf)}</p>}
        </section>
      </div>
      <p className="note muted">
        {x.note} <Link to="/guide">{shared.more}</Link>
      </p>
    </>
  )
}

export function PlannerPage() {
  const { lang } = useI18n()
  const [mode, setMode] = useState<'char' | 'arc'>(() => {
    try {
      return localStorage.getItem('hethereau-ledger.plannerMode') === 'arc' ? 'arc' : 'char'
    } catch {
      return 'char'
    }
  })
  const pick = (m: 'char' | 'arc') => {
    setMode(m)
    try {
      localStorage.setItem('hethereau-ledger.plannerMode', m)
    } catch {
      /* ignore */
    }
  }
  return (
    <article className="planner">
      <h1>{TEXT[lang].title}</h1>
      <div className="seg planner-mode" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'char'} className={mode === 'char' ? 'is-on' : ''} onClick={() => pick('char')}>
          {lang === 'uk' ? 'Персонаж' : 'Character'}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'arc'} className={mode === 'arc' ? 'is-on' : ''} onClick={() => pick('arc')}>
          Arc
        </button>
      </div>
      {mode === 'char' ? <CharacterPlanner /> : <ArcPlanner />}
    </article>
  )
}
