import { useEffect, useMemo, useState } from 'react'
import { hasIcon, resolveAll } from '../lib/dictionary'
import { fetchAggregate, luckierThan, summarize, type Aggregate } from '../lib/globalStats'
import { useI18n, type Lang } from '../lib/i18n'
import { fmtEur, pullValue } from '../lib/spend'
import { computeStats } from '../lib/stats'
import { POOL_IDS, type Profile } from '../lib/types'

/** A 1080×1350 picture of the player's luck, drawn on a canvas, to post anywhere. */
const W = 1080
const H = 1350
const C = {
  night: '#12162b',
  deep: '#0a0d1c',
  pink: '#ff5fa8',
  teal: '#4fe3d2',
  sodium: '#ffb547',
  ink: '#eef0ff',
  muted: '#9aa0c8',
  line: '#2a3056',
}

interface CardData {
  name: string
  hero: { top: string; big: string; bottom: string }
  recent: { id: string; name: string; pity: number }[]
  stats: { label: string; value: string }[]
}

const TEXT = {
  uk: {
    button: 'Картка для соцмереж',
    title: 'Картка з твоєю удачею',
    lead: 'Готова картинка 1080×1350 для Discord, Instagram чи TikTok.',
    showValue: 'Показати вартість круток',
    download: 'Завантажити',
    share: 'Поділитися',
    close: 'Закрити',
    luckier: ['Удачливіший за', 'гравців'],
    luck: ['Удача', 'від звичайного шансу гри'],
    noS: ['Поки без S', 'усе ще попереду'],
    recent: 'Останні S',
    pulls: 'Кидків',
    s: 'S-персонажів',
    avg: 'Сер. гарант S',
    value: 'Вартість',
  },
  en: {
    button: 'Card for social media',
    title: 'Your luck card',
    lead: 'A ready 1080×1350 picture for Discord, Instagram or TikTok.',
    showValue: 'Show the value of pulls',
    download: 'Download',
    share: 'Share',
    close: 'Close',
    luckier: ['Luckier than', 'of players'],
    luck: ['Luck', 'of the usual game rate'],
    noS: ['No S yet', 'all still ahead'],
    recent: 'Latest S',
    pulls: 'Pulls',
    s: 'S characters',
    avg: 'Avg S pity',
    value: 'Value',
  },
}

function buildData(profile: Profile, agg: Aggregate | null, showValue: boolean, lang: Lang): CardData {
  const x = TEXT[lang]
  const limited = computeStats('Lottery_LimitedCharacter', resolveAll(profile.records.Lottery_LimitedCharacter))
  const paid = POOL_IDS.filter((p) => p !== 'Gashapon_MysteryBox').reduce(
    (a, p) => a + computeStats(p, resolveAll(profile.records[p])).totalPulls,
    0,
  )
  const mine = summarize(profile)
  const myAvg = mine?.pities.length ? mine.pities.reduce((a, b) => a + b, 0) / mine.pities.length : null
  const share = agg && agg.players >= 10 && myAvg !== null ? luckierThan(agg.avgs, Math.round(myAvg * 10) / 10) : null

  let hero: CardData['hero']
  if (share !== null) hero = { top: x.luckier[0], big: `${Math.round(share * 100)}%`, bottom: x.luckier[1] }
  else if (limited.luck !== null) hero = { top: x.luck[0], big: `${Math.round(limited.luck * 100)}%`, bottom: x.luck[1] }
  else hero = { top: x.noS[0], big: '—', bottom: x.noS[1] }

  const stats = [
    { label: x.pulls, value: paid.toLocaleString(lang === 'uk' ? 'uk-UA' : 'en-GB') },
    { label: x.s, value: String(limited.sDrops.length) },
    { label: x.avg, value: limited.avgPity !== null ? limited.avgPity.toFixed(1) : '—' },
  ]
  if (showValue) stats.push({ label: x.value, value: `≈ ${fmtEur(pullValue(paid).eur, lang)}` })

  return {
    name: profile.name || 'Neverness to Everness',
    hero,
    recent: limited.sDrops
      .slice(-5)
      .reverse()
      .map((d) => ({ id: d.record.rewardId, name: d.record.name, pity: d.pity })),
    stats,
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function draw(canvas: HTMLCanvasElement, d: CardData, lang: Lang) {
  const x = TEXT[lang]
  await Promise.all([
    document.fonts.load('700 64px Tektur'),
    document.fonts.load('600 32px "Golos Text"'),
    document.fonts.load('400 32px "Golos Text"'),
  ]).catch(() => {})
  const ctx = canvas.getContext('2d')!
  canvas.width = W
  canvas.height = H

  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, C.night)
  bg.addColorStop(1, C.deep)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  const glow = (cx: number, cy: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  glow(W - 80, 80, 520, 'rgba(255,95,168,0.28)')
  glow(60, H - 60, 560, 'rgba(79,227,210,0.18)')

  // A few thin street-grid lines, the site's city-neon motif.
  ctx.strokeStyle = 'rgba(154,160,200,0.07)'
  ctx.lineWidth = 2
  for (let y = 240; y < H; y += 120) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = C.pink
  ctx.shadowBlur = 24
  ctx.fillStyle = C.pink
  ctx.font = '700 48px Tektur'
  ctx.fillText('Hethereau Ledger', 80, 120)
  ctx.shadowBlur = 0
  ctx.fillStyle = C.muted
  ctx.font = '600 34px "Golos Text"'
  ctx.fillText(d.name.slice(0, 32), 80, 176)

  // Hero
  ctx.fillStyle = C.ink
  ctx.font = '700 58px Tektur'
  ctx.fillText(d.hero.top, 80, 330)
  ctx.shadowColor = C.sodium
  ctx.shadowBlur = 30
  ctx.fillStyle = C.sodium
  ctx.font = '700 200px Tektur'
  ctx.fillText(d.hero.big, 70, 530)
  ctx.shadowBlur = 0
  ctx.fillStyle = C.ink
  ctx.font = '700 58px Tektur'
  ctx.fillText(d.hero.bottom, 80, 610)

  // Latest S portraits with their pity
  if (d.recent.length) {
    ctx.fillStyle = C.muted
    ctx.font = '400 30px "Golos Text"'
    ctx.fillText(x.recent, 80, 720)
    const size = 150
    const gap = 30
    const imgs = await Promise.all(
      d.recent.map((r) =>
        r.id && hasIcon(r.id) ? loadImage(`${import.meta.env.BASE_URL}portraits/${r.id.toLowerCase()}.webp`) : Promise.resolve(null),
      ),
    )
    d.recent.forEach((r, i) => {
      const cx = 80 + size / 2 + i * (size + gap)
      const cy = 760 + size / 2
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.fillStyle = '#1b2142'
      ctx.fill()
      ctx.clip()
      const img = imgs[i]
      if (img) ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size)
      else {
        ctx.fillStyle = C.ink
        ctx.font = '700 48px Tektur'
        ctx.textAlign = 'center'
        ctx.fillText(r.name.slice(0, 2), cx, cy + 16)
        ctx.textAlign = 'left'
      }
      ctx.restore()
      ctx.strokeStyle = C.sodium
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = C.teal
      ctx.font = '700 38px Tektur'
      ctx.textAlign = 'center'
      ctx.fillText(String(r.pity), cx, cy + size / 2 + 52)
      ctx.textAlign = 'left'
    })
  }

  // Stats grid
  const top = 1040
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(80, top - 50)
  ctx.lineTo(W - 80, top - 50)
  ctx.stroke()
  const cols = d.stats.length
  const colW = (W - 160) / cols
  d.stats.forEach((s, i) => {
    const x0 = 80 + i * colW
    ctx.fillStyle = C.muted
    ctx.font = '400 28px "Golos Text"'
    ctx.fillText(s.label, x0, top)
    ctx.fillStyle = C.ink
    let size = cols > 3 ? 54 : 60
    ctx.font = `700 ${size}px Tektur`
    while (size > 30 && ctx.measureText(s.value).width > colW - 16) {
      size -= 2
      ctx.font = `700 ${size}px Tektur`
    }
    ctx.fillText(s.value, x0, top + 72)
  })

  ctx.fillStyle = C.teal
  ctx.font = '600 32px "Golos Text"'
  ctx.textAlign = 'center'
  ctx.fillText('hethereau-ledger.pages.dev', W / 2, H - 70)
  ctx.textAlign = 'left'
}

export function ShareCard({ profile }: { profile: Profile }) {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const [open, setOpen] = useState(false)
  const [showValue, setShowValue] = useState(false)
  const [agg, setAgg] = useState<Aggregate | null>(null)
  const [url, setUrl] = useState('')
  const data = useMemo(() => buildData(profile, agg, showValue, lang), [profile, agg, showValue, lang])

  useEffect(() => {
    if (!open) return
    let alive = true
    fetchAggregate().then((a) => alive && setAgg(a))
    return () => {
      alive = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    let alive = true
    const canvas = document.createElement('canvas')
    draw(canvas, data, lang).then(() => alive && setUrl(canvas.toDataURL('image/png')))
    return () => {
      alive = false
    }
  }, [open, data, lang])

  // Built by hand: the CSP does not allow fetch() on data: URLs.
  const file = () => {
    const bin = atob(url.split(',')[1])
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return new File([bytes], 'hethereau-ledger.png', { type: 'image/png' })
  }
  const canShare = typeof navigator !== 'undefined' && 'canShare' in navigator

  if (!open)
    return (
      <button className="btn btn--ghost share-card-btn" onClick={() => setOpen(true)}>
        {x.button}
      </button>
    )

  return (
    <section className="share-card" aria-label={x.title}>
      <h2>{x.title}</h2>
      <p className="muted">{x.lead}</p>
      {url ? <img src={url} alt={x.title} width={360} height={450} /> : <div className="share-card-wait" />}
      <label className="check">
        <input type="checkbox" checked={showValue} onChange={(e) => setShowValue(e.target.checked)} />
        <span>{x.showValue}</span>
      </label>
      <div className="actions">
        <a className={'btn' + (url ? '' : ' is-disabled')} href={url || undefined} download="hethereau-ledger.png">
          {x.download}
        </a>
        {canShare && (
          <button
            className="btn btn--ghost"
            disabled={!url}
            onClick={async () => {
              try {
                const f = file()
                if (navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Hethereau Ledger' })
              } catch {
                /* cancelled */
              }
            }}
          >
            {x.share}
          </button>
        )}
        <button className="link-btn" onClick={() => setOpen(false)}>
          {x.close}
        </button>
      </div>
    </section>
  )
}
