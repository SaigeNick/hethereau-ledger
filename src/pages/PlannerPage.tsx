import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveAll } from '../lib/dictionary'
import { useI18n } from '../lib/i18n'
import { ANNULITH_PER_ROLL, plan } from '../lib/planner'
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

export function PlannerPage() {
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
    <article className="planner">
      <h1>{x.title}</h1>
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
    </article>
  )
}
