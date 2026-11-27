import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveAll } from '../lib/dictionary'
import { pullsUk, rollsUk } from '../lib/plural'
import { useI18n } from '../lib/i18n'
import { arcPity } from '../lib/arc'
import { ANNULITH_PER_ROLL, arcPlan, plan } from '../lib/planner'
import type { PullRecord } from '../lib/types'
import { computeStats } from '../lib/stats'
import { useStore } from '../lib/store'

const KEY = 'hethereau-ledger.planner'
interface Saved {
  annulith: string
  dice: string
  warp: string
  daily: string
  days: string
  copies: number
  pity: string
}
const EMPTY: Saved = { annulith: '', dice: '', warp: '', daily: '', days: '', copies: 1, pity: '' }

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

const TEXT = {
  uk: {
    title: 'Калькулятор круток',
    lead: 'Порахуйте, чи вистачить ресурсів отримати персонажа з лімітованого банера. На дошках персонажів немає 50/50, тож кожен S-персонаж — це персонаж банера.',
    pity: 'Поточний гарант',
    pityHint: (n: number) => `З вашої історії: ${n}`,
    pityNone: 'Кидків від останнього S-персонажа',
    annulith: 'Annulith зараз',
    dice: 'Solid Dice',
    warp: 'Warp Pieces',
    warpHint: '5 штук = 1 кидок (обмін у Piece Shop)',
    daily: 'Annulith на день (необов’язково)',
    days: 'Днів до кінця банера',
    copies: 'Ціль',
    copy: (n: number) => (n === 1 ? 'Персонаж' : `Пробудження ${n - 1}`),
    chance: (c: number) => (c === 1 ? 'Шанс отримати персонажа' : `Шанс на пробудження ${c - 1}`),
    rolls: (n: number) => `Вистачить на ${rollsUk(n)}`,
    guaranteed: 'Гарантовано: ресурсів вистачає до гаранту.',
    missing: (r: number, a: number) => `До гаранту бракує ${rollsUk(r)}, це ≈ ${a.toLocaleString('uk-UA')} Annulith.`,
    half: (r: number) => `Для шансу 50% потрібно ${rollsUk(r)}.`,
    note: `Один кидок коштує ${ANNULITH_PER_ROLL} Annulith. Шанси: 0,99% на кидок до 70-го, 19,59% з 71-го, 90-й кидок гарантований (дані спільноти, не офіційні). Бонусні нагороди кожні 10 кидків не враховуються.`,
    more: 'Як працює гача',
  },
  en: {
    title: 'Pull planner',
    lead: 'Work out whether your resources are enough to get the character from the limited banner. Character boards have no 50/50, so every S-Class character is the banner character.',
    pity: 'Current pity',
    pityHint: (n: number) => `From your history: ${n}`,
    pityNone: 'Rolls since your last S-Class character',
    annulith: 'Annulith now',
    dice: 'Solid Dice',
    warp: 'Warp Pieces',
    warpHint: '5 pieces = 1 roll (Piece Shop exchange)',
    daily: 'Annulith per day (optional)',
    days: 'Days until the banner ends',
    copies: 'Goal',
    copy: (n: number) => (n === 1 ? 'Character' : `Awakening Lvl ${n - 1}`),
    chance: (c: number) => (c === 1 ? 'Chance to get the character' : `Chance of Awakening Lvl ${c - 1}`),
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
    warp: num(v.warp),
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
          <label>
            <span>{x.warp}</span>
            <input inputMode="numeric" value={v.warp} placeholder="0" onChange={set('warp')} />
            <small className="muted">{x.warpHint}</small>
          </label>
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

export function arcCounters(records: PullRecord[]) {
  const { sinceS, sinceF } = arcPity(records)
  return { sinceS, sinceF }
}

const ARC_KEY = 'hethereau-ledger.plannerArc'
interface ArcSaved {
  pulls: string
  warp: string
  copies: number
  sinceS: string
  sinceF: string
}
const ARC_EMPTY: ArcSaved = { pulls: '', warp: '', copies: 1, sinceS: '', sinceF: '' }

const ARC_TEXT = {
  uk: {
    lead: 'Шанс отримати UP Arc банера. Arc S-класу гарантовано за 60 круток, UP Arc — за 80, і гарант переходить між банерами. Крутки лише по 10.',
    sinceS: 'Круток від останнього Arc S-класу',
    sinceF: 'Круток від останнього UP Arc',
    fromHistory: (n: number) => `З вашої історії: ${n}`,
    noHistory: 'Імпортуйте історію Arc, і число підставиться саме',
    pulls: 'Tri-Key (по 1 на крутку)',
    pullsHint: 'Рахуються десятками: 37 → 30',
    copies: 'Ціль',
    copy: (n: number) => (n === 1 ? 'UP Arc' : `${n} копії`),
    chance: (c: number) => (c === 1 ? 'Шанс отримати UP Arc' : `Шанс отримати ${c} копії UP Arc`),
    rolls: (n: number) => `Рахуємо ${pullsUk(n)}`,
    guaranteed: 'Гарантовано: вистачає до гаранту UP Arc.',
    missing: (n: number) => `До гаранту бракує ${pullsUk(n)}.`,
    half: (n: number) => `Для шансу 50% потрібно ${pullsUk(n)}.`,
    note: 'Шанси: 3% на Arc S-класу за крутку, 25% із них — UP Arc. Гра не публікує, як саме росте шанс ближче до гаранту, тому розрахунок трохи обережніший за реальність.',
  },
  en: {
    lead: 'Chance to get the banner’s UP Arc. An S-Class Arc is guaranteed within 60 pulls and the UP Arc within 80, and pity carries over between banners. Pulls come in tens.',
    sinceS: 'Pulls since your last S-Class Arc',
    sinceF: 'Pulls since your last UP Arc',
    fromHistory: (n: number) => `From your history: ${n}`,
    noHistory: 'Import your Arc history and this fills itself in',
    pulls: 'Tri-Keys (1 per pull)',
    pullsHint: 'Counted in tens: 37 → 30',
    copies: 'Goal',
    copy: (n: number) => (n === 1 ? 'UP Arc' : `${n} copies`),
    chance: (c: number) => (c === 1 ? 'Chance to get the UP Arc' : `Chance to get ${c} copies of the UP Arc`),
    rolls: (n: number) => `Counting ${n} pulls`,
    guaranteed: 'Guaranteed: you reach the UP Arc pity.',
    missing: (n: number) => `${n} pulls short of guaranteed.`,
    half: (n: number) => `A 50% chance takes ${n} pulls.`,
    note: 'Rates: 3% for an S-Class Arc per pull, 25% of those are the UP Arc. The game does not publish how the rate rises near pity, so this estimate is slightly cautious.',
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
  const r = arcPlan({ sinceS: Math.min(sinceS, sinceF), sinceF, pulls: num(v.pulls), warp: num(v.warp), copies: v.copies })
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
          <label>
            <span>{shared.warp}</span>
            <input inputMode="numeric" value={v.warp} placeholder="0" onChange={set('warp')} />
            <small className="muted">{shared.warpHint}</small>
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
