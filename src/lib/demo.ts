import type { PoolId } from './types'

/** Builds exporter-shaped JSON so people can try the site before exporting their own history. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

const LIMITED_S = [
  ['1010', 'Nanally'],
  ['1052', 'Hotori'],
  ['1056', 'Lacrimosa'],
  ['1075', 'Iroi'],
  ['1036', 'Zankou'],
]
const STANDARD_S = [
  ['1003', 'Sakiri'],
  ['1023', 'Baicang'],
  ['1025', 'Hathor'],
  ['1039', 'Fadia'],
  ['1055', 'Jiuyuan'],
]
const A_CHARS = [
  ['1033', 'Adler'],
  ['1021', 'Edgar'],
  ['1019', 'Mint'],
  ['1020', 'Haniel'],
  ['1070', 'Aurelia'],
  ['1008', 'Skia'],
]
const FILLER = [
  ['CityAbility_UpMaterial', 'Dreamless Seed', 'B'],
  ['CharacterUpMaterial_lv3', 'Elite Hunter Guide', 'A'],
  ['Fons', 'Fons', 'C'],
]

function stamp(base: number, i: number) {
  const d = new Date(base + i * 36e5 * 7)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
}

function wrap(pool: PoolId, name: string, system: string, records: unknown[]) {
  return {
    format: 'nte-history-export',
    format_version: 1,
    game: 'Neverness to Everness',
    source: 'demo',
    exporter: { name: 'hethereau-ledger-demo', version: '1' },
    banner: { id: pool, name, system, shared_pity: pool !== 'Lottery_Permanent' },
    scan: { warnings: [] },
    user_uid: 'demo',
    account_region: 'EU',
    records,
  }
}

function monopoly(pool: PoolId, groups: number, seed: number, sPool: string[][]) {
  const rand = rng(seed)
  const records: unknown[] = []
  let pity = 0
  let sIndex = 0
  const base = Date.UTC(2026, 3, 29, 12)
  for (let g = 0; g < groups; g++) {
    const time = stamp(base, g)
    const rows: unknown[] = []
    for (let k = 0; k < 10; k++) {
      pity++
      const pS = pity >= 90 ? 1 : pity > 70 ? 0.1959 : 0.0099
      const roll = 1 + Math.floor(rand() * 6)
      let reward: string[]
      let type = 'item'
      let rank = 'B'
      if (rand() < pS) {
        reward = sPool[sIndex++ % sPool.length]
        type = 'character'
        rank = 'S'
        pity = 0
      } else if (rand() < 0.1167) {
        reward = A_CHARS[Math.floor(rand() * A_CHARS.length)]
        type = 'character'
        rank = 'A'
      } else {
        const f = FILLER[Math.floor(rand() * FILLER.length)]
        reward = [f[0], f[1]]
        rank = f[2]
      }
      rows.push({ roll_result: roll, result_type: 'dice', reward_type: type, reward_id: reward[0], reward_name: reward[1], reward_rank: rank, quantity: 1 })
    }
    rows.reverse().forEach((r, ord) =>
      records.push({ uid: `demo-${pool}-${g}-${ord}`, pool_group_id: pool, timestamp: time, timestamp_group_ordinal: ord, ...(r as object) }),
    )
  }
  return records.reverse()
}

function arcs(groups: number, seed: number) {
  const rand = rng(seed)
  const records: unknown[] = []
  let pity = 0
  const base = Date.UTC(2026, 4, 2, 18)
  const S = [
    ['fork_Arachne', 'Eternal Waltz'],
    ['fork_BlackBook', 'Youthful Fantasy'],
  ]
  for (let g = 0; g < groups; g++) {
    const time = stamp(base, g * 3)
    for (let ord = 9; ord >= 0; ord--) {
      pity++
      const isS = pity >= 60 || rand() < 0.03
      const isA = !isS && rand() < 0.07
      if (isS) pity = 0
      const [id, name] = isS ? S[g % 2] : isA ? ['fork_BitterCake', 'The Good, The Bad, The Bitter'] : ['fork_nonos', 'First Step to Success']
      records.push({ uid: `demo-arc-${g}-${ord}`, pool_group_id: 'Arc_MiracleBox', timestamp: time, timestamp_group_ordinal: ord, reward_type: 'arc', reward_id: id, reward_name: name, reward_rank: isS ? 'S' : isA ? 'A' : 'B', source_type: 'miracle_box' })
    }
  }
  return records.reverse()
}

function mystery() {
  const records: unknown[] = []
  const base = Date.UTC(2026, 6, 8, 19)
  for (let i = 0; i < 15; i++) {
    const s = i === 11
    records.push({ uid: `demo-mb-${i}`, pool_group_id: 'Gashapon_MysteryBox', timestamp: stamp(base, i), timestamp_group_ordinal: 0, result_type: 'single_pull', reward_type: 'item', reward_id: s ? 'vehicle039' : 'CityAbility_UpMaterial', reward_name: s ? 'Draco' : 'Dreamless Seed', reward_rank: s ? 'S' : 'B', quantity: 1 })
  }
  return records.reverse()
}

export function demoFiles(): string[] {
  return [
    wrap('Lottery_LimitedCharacter', 'Limited Character Board', 'Monopoly', monopoly('Lottery_LimitedCharacter', 31, 7, LIMITED_S)),
    wrap('Lottery_Permanent', 'Standard Board', 'Monopoly', monopoly('Lottery_Permanent', 12, 21, STANDARD_S)),
    wrap('Arc_MiracleBox', 'Arc Miracle Box', 'Gashapon', arcs(14, 5)),
    wrap('Gashapon_MysteryBox', 'Mystery Box', 'Gashapon', mystery()),
  ].map((d) => JSON.stringify(d))
}
