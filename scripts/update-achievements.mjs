// Rebuilds src/data/achievements.json and public/achievements/ from the
// community datamine (Waifus-Grace/NTE_Assets). Runs daily with the reward
// dictionary, so new achievements appear on the site by themselves.
//
//   node scripts/update-achievements.mjs [--ref main] [--no-images]

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import sharp from 'sharp'

const args = process.argv.slice(2)
const ref = args.includes('--ref') ? args[args.indexOf('--ref') + 1] : 'main'
const withImages = !args.includes('--no-images')
const RAW = `https://raw.githubusercontent.com/Waifus-Grace/NTE_Assets/${ref}/`

async function getJson(path) {
  const res = await fetch(RAW + path)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json()
}

const loc = await getJson('Localization/en/game.json')
const ns = (tableId) => String(tableId ?? '').split('.').pop()
const text = (f) => (f ? (loc[ns(f.TableId)]?.[f.Key] || f.LocalizedString || '').trim() : '')
// Rich-text tags like <Orange>…</> are for the game UI only.
const plain = (s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

const table = await getJson('DataTable/DT_AchievementConfigInfo.json')
const rows = (Array.isArray(table) ? table[0].Rows : table.Rows) ?? table

const QUALITY = { Normal: 1, High: 2, EXECELLENT: 3, EXCELLENT: 3 }
const categories = {}
const list = []
const iconPaths = new Map()

for (const [id, r] of Object.entries(rows)) {
  const cat = String(r.AchievementMainType ?? '').replace(/^.*MainType/, '')
  if (!cat) continue
  categories[cat] ??= {
    name: loc.ST_Ui?.[`Achievement_${cat}_Nickname`] ?? cat,
    tape: loc.ST_Ui?.[`Achievement_${cat}`] ?? '',
  }
  const icon = String(r.icon?.AssetPathName ?? '').split('.').pop()
  if (icon) iconPaths.set(icon, `UI/Achievement/${icon}.png`)
  const annulith = (r.AwardInfo ?? []).filter((a) => a.ItemID === 'Annulith').reduce((s, a) => s + (a.Amount ?? 0), 0)
  const other = (r.AwardInfo ?? []).filter((a) => a.ItemID !== 'Annulith').map((a) => a.ItemID)
  list.push({
    id,
    c: cat,
    t: plain(text(r.TitleId)),
    d: plain(text(r.ContentID)),
    h: r.bIsHideNotAchieve ? 1 : 0,
    q: QUALITY[String(r.Quality ?? '').split('::').pop()] ?? 1,
    a: annulith,
    ...(other.length ? { o: other } : {}),
    ...(icon ? { i: icon.toLowerCase() } : {}),
  })
}

const icons = []
if (withImages) {
  await mkdir('public/achievements', { recursive: true })
  for (const [icon, src] of iconPaths) {
    const key = icon.toLowerCase()
    const file = `public/achievements/${key}.webp`
    if (!existsSync(file)) {
      const res = await fetch(RAW + src)
      if (!res.ok) continue
      const img = await sharp(Buffer.from(await res.arrayBuffer())).resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toBuffer()
      await writeFile(file, img)
    }
    icons.push(key)
  }
}

const out = JSON.stringify({ source: 'Waifus-Grace/NTE_Assets', ref, categories, icons: icons.sort(), list }) + '\n'
const before = existsSync('src/data/achievements.json') ? await readFile('src/data/achievements.json', 'utf8') : ''
await mkdir('src/data', { recursive: true })
await writeFile('src/data/achievements.json', out)
console.log(`achievements: ${list.length}, hidden ${list.filter((x) => x.h).length}, icons ${icons.length}`, before === out ? '(no change)' : '(updated)')
