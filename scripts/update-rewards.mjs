// Rebuilds src/data/rewards.json and public/portraits/ from the community
// datamine (Waifus-Grace/NTE_Assets). Runs daily in GitHub Actions, so new
// characters and Arcs show up on the site without anyone updating anything.
//
//   node scripts/update-rewards.mjs [--ref main] [--no-images]

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import sharp from 'sharp'

const args = process.argv.slice(2)
const ref = args.includes('--ref') ? args[args.indexOf('--ref') + 1] : 'main'
const withImages = !args.includes('--no-images')
const RAW = `https://raw.githubusercontent.com/Waifus-Grace/NTE_Assets/${ref}/`

const TABLES = [
  { path: 'DataTable/Character/DT_Character.json', type: 'character', icon: 'ItemIconBig' },
  { path: 'DataTable/Fork/DT_ForkItemData.json', type: 'arc', icon: 'ItemIcon' },
  { path: 'DataTable/Inventory/DT_ItemConfig.json', type: 'item' },
  { path: 'DataTable/Inventory/DT_CapitalItemConfig.json', type: 'item' },
  { path: 'DataTable/Vehicle/DT_VehicleItemData.json', type: 'item' },
  { path: 'DataTable/Character/Appearance/DT_AppearanceData.json', type: 'cosmetic' },
]

const QUALITY = { ORANGE: 'S', PURPLE: 'A', BLUE: 'B', GREEN: 'C', WHITE: 'C' }

async function getJson(path) {
  const res = await fetch(RAW + path)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json()
}

function namespaceOf(tableId) {
  // "/Game/Text/ST_Player.ST_Player" -> "ST_Player"
  return String(tableId ?? '').split('.').pop()
}

const loc = await getJson('Localization/en/game.json')

function nameOf(field) {
  if (!field) return ''
  const fromLoc = loc[namespaceOf(field.TableId)]?.[field.Key]
  return (fromLoc || field.LocalizedString || '').trim()
}

const rewards = {}
const icons = []
for (const t of TABLES) {
  const doc = await getJson(t.path)
  const rows = doc[0]?.Rows ?? {}
  for (const [id, row] of Object.entries(rows)) {
    const name = nameOf(row.ItemName ?? row.Name)
    const quality = String(row.ItemQuality ?? row.Quality ?? '').split('_').pop()
    if (!name || name === 'None') continue
    const key = id.toLowerCase()
    if (rewards[key]) continue // first table wins: characters and Arcs before items
    const rank = QUALITY[quality] ?? 'C'
    rewards[key] = [name, rank, t.type]
    const iconPath = t.icon && row[t.icon]?.AssetPathName
    if (iconPath && iconPath.startsWith('/Game/UI/UI_Icon/')) {
      icons.push({ key, src: 'UI_Icon/' + iconPath.slice('/Game/UI/UI_Icon/'.length).split('.')[0] + '.png' })
    }
  }
}

let withIcon = new Set()
if (withImages) {
  await mkdir('public/portraits', { recursive: true })
  for (const { key, src } of icons) {
    const file = `public/portraits/${key}.webp`
    if (existsSync(file)) {
      withIcon.add(key)
      continue
    }
    const res = await fetch(RAW + src)
    if (!res.ok) continue
    // Small square webp keeps the site light.
    const img = await sharp(Buffer.from(await res.arrayBuffer())).resize(128, 128, { fit: 'cover', position: 'top' }).webp({ quality: 82 }).toBuffer()
    await writeFile(file, img)
    withIcon.add(key)
  }
} else if (existsSync('src/data/rewards.json')) {
  const prev = JSON.parse(await readFile('src/data/rewards.json', 'utf8'))
  withIcon = new Set(prev.icons ?? [])
}

const sortedKeys = Object.keys(rewards).sort()
const out = {
  source: 'Waifus-Grace/NTE_Assets',
  ref,
  rewards: Object.fromEntries(sortedKeys.map((k) => [k, rewards[k]])),
  icons: [...withIcon].sort(),
}
await mkdir('src/data', { recursive: true })
const text = JSON.stringify(out) + '\n'
const before = existsSync('src/data/rewards.json') ? await readFile('src/data/rewards.json', 'utf8') : ''
await writeFile('src/data/rewards.json', text)
const counts = Object.values(rewards).reduce((a, r) => ((a[r[2]] = (a[r[2]] ?? 0) + 1), a), {})
console.log(`rewards: ${sortedKeys.length}`, counts, `icons: ${withIcon.size}`, before === text ? '(no change)' : '(updated)')
