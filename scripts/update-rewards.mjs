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
  { path: 'DataTable/Inventory/DT_ItemConfig.json', type: 'item', icon: 'ItemIcon', onlyIfGacha: true },
  { path: 'DataTable/Inventory/DT_CapitalItemConfig.json', type: 'item', icon: 'ItemIcon', onlyIfGacha: true },
  { path: 'DataTable/Vehicle/DT_VehicleItemData.json', type: 'vehicle' },
  { path: 'DataTable/Character/Appearance/DT_AppearanceData.json', type: 'cosmetic', icon: 'DisplayIcon', onlyIfGacha: true },
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
// Items get icons only when a gacha table can hand them out, so the site
// carries a few dozen pictures instead of thousands.
async function gachaRewardIds() {
  const headers = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}
  const res = await fetch(`https://api.github.com/repos/Waifus-Grace/NTE_Assets/git/trees/${ref}?recursive=1`, { headers })
  const paths = res.ok ? (await res.json()).tree.map((x) => x.path) : []
  const tables = paths.filter((p) => /^DataTable\/(Monopoly|Gacha)\/.*\.json$/.test(p))
  if (!tables.length) {
    // Known tables, for when the tree API is rate limited.
    tables.push(
      'DataTable/Monopoly/DT_MonopolyCellDataTable.json',
      'DataTable/Gacha/GachaIllustrate.json',
      'DataTable/Gacha/DT_LotteryDataTable_Nanali.json',
    )
  }
  const words = new Set()
  for (const p of tables) {
    const r = await fetch(RAW + p)
    if (!r.ok) continue
    for (const w of (await r.text()).match(/[A-Za-z][A-Za-z0-9_]{3,}/g) ?? []) words.add(w.toLowerCase())
  }
  // Rewards seen on the board that the tables name only indirectly.
  for (const w of ['dice_ticket_01', 'dice_ticket_02', 'dicelimite', 'dicenormal']) words.add(w)
  return words
}
const gachaIds = await gachaRewardIds()

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
    const wantIcon = !t.onlyIfGacha || gachaIds.has(key) || key.startsWith('fashion_')
    const iconPath = wantIcon && t.icon && (row[t.icon]?.AssetPathName || row.ItemIcon?.AssetPathName || row.DisplayIcon?.AssetPathName || row.ItemIconBig?.AssetPathName)
    const srcs = []
    const glide = /^fashion_glide_(.+)$/i.exec(id) ?? (/^glide_all_default$/i.test(id) ? [id, 'Default'] : null)
    if (glide) {
      // Gliders: the appearance art beats the generic item icon. File names are
      // case-sensitive on GitHub, so try the spellings the game uses.
      const tail = glide[1]
      srcs.push(
        `UI/Appearance/Glider/Fashion_Glide_${tail}.png`,
        `UI/Appearance/Glider/YH_UI_Glider_lihui_${tail}.png`,
        `UI/Appearance/Glider/YH_UI_Glider_lihui_${tail}_01.png`,
        `UI/Appearance/Glider/${id}.png`,
      )
    }
    if (iconPath && iconPath.startsWith('/Game/UI/UI_Icon/')) {
      srcs.push('UI_Icon/' + iconPath.slice('/Game/UI/UI_Icon/'.length).split('.')[0] + '.png')
    }
    if (srcs.length) icons.push({ key, srcs })
  }
}

// Vehicle liveries and gliders also live in the item tables.
for (const [k, v] of Object.entries(rewards)) {
  if (v[2] !== 'item') continue
  if (/(^|_)(vehicle|livery)/i.test(k)) v[2] = 'vehicle'
  else if (/^fashion_/i.test(k)) v[2] = 'cosmetic' // outfits and gliders
}

let withIcon = new Set()
if (withImages) {
  await mkdir('public/portraits', { recursive: true })
  for (const { key, srcs } of icons) {
    const file = `public/portraits/${key}.webp`
    if (existsSync(file)) {
      withIcon.add(key)
      continue
    }
    let res = null
    for (const src of srcs) {
      const r = await fetch(RAW + src)
      if (r.ok) {
        res = r
        break
      }
    }
    if (!res) continue
    // Small square webp keeps the site light.
    const img = await sharp(Buffer.from(await res.arrayBuffer())).resize(128, 128, { fit: 'cover', position: 'top' }).webp({ quality: 82 }).toBuffer()
    await writeFile(file, img)
    withIcon.add(key)
  }
}
// Keep pictures fetched on earlier runs even if this run's table scan missed them.
if (existsSync('src/data/rewards.json')) {
  const prev = JSON.parse(await readFile('src/data/rewards.json', 'utf8'))
  for (const k of prev.icons ?? []) if (existsSync(`public/portraits/${k}.webp`) && rewards[k]) withIcon.add(k)
}

// What the gacha banners offer, from the in-game gacha showcase: the playable
// characters and each limited banner's outfit, car skin and glider.
{
  const doc = await getJson('DataTable/Gacha/GachaIllustrate.json')
  const keys = Object.keys(doc[0]?.Rows ?? {})
  const characters = keys.filter((k) => /^\d{4}$/.test(k) && rewards[k]?.[2] === 'character')
  const skins = []
  for (const k of keys) {
    const id = k.toLowerCase()
    if (!rewards[id]) continue
    const char = /^fashion_(?:character_|glide_|vehicle(?:skin)?_)?(\d{4})/.exec(id)?.[1]
    if (!char) continue
    const kind = id.startsWith('fashion_glide_') ? 'glider' : id.startsWith('fashion_vehicle') ? 'car' : 'outfit'
    skins.push({ id, char, kind })
  }
  const text = JSON.stringify({ characters, skins }) + '\n'
  await writeFile('src/data/collection.json', text)
  console.log(`collection: ${characters.length} characters, ${skins.length} skins`)
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
