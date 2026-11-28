import { describe, expect, it } from 'vitest'
import { ACH_TAG, achievementsFromFrames, completedSiteIds, parseAchievementBlock, parseAchievementExport } from './achievementsImport'
import { decodePackets } from './nteDecoder'

/** Same layout the game uses after the marker (see achievementsImport.ts). */
function block(recs: [string, number, bigint][]) {
  const parts: number[] = [...new TextEncoder().encode('AchievementRecord\0'), 1, 1, 1, 1]
  const u32 = new DataView(new ArrayBuffer(4))
  u32.setUint32(0, recs.length, true)
  parts.push(...new Uint8Array(u32.buffer), ...new Array(12).fill(2))
  for (const [id, progress, ticks] of recs) {
    const v = new DataView(new ArrayBuffer(16))
    v.setBigUint64(0, BigInt(progress), true)
    v.setBigUint64(8, ticks, true)
    parts.push(...new TextEncoder().encode(id + '\0'), ...new Uint8Array(v.buffer))
  }
  return new Uint8Array(parts)
}

const recs: [string, number, bigint][] = [
  ['Explore_1', 3, 639100000000000000n],
  ['battle_25', 20, 0n],
  ['Collect_9', 1, 639200000000000123n],
  ['PS_Trophy_1', 1, 639200000000000000n],
]

describe('achievements from the game', () => {
  it('reads every record after the marker', () => {
    const got = parseAchievementBlock(block(recs))
    expect(got.map((a) => [a.id, a.progress, a.completed])).toEqual([
      ['Explore_1', 3, true],
      ['battle_25', 20, false],
      ['Collect_9', 1, true],
      ['PS_Trophy_1', 1, true],
    ])
  })
  it('rejects a block that is cut short', () => {
    expect(parseAchievementBlock(block(recs).subarray(0, 60))).toEqual([])
  })
  it('comes out of the command result next to history pages', async () => {
    const frame = new Uint8Array([...ACH_TAG, ...block(recs)])
    expect(decodePackets([frame])).toEqual({})
    const found = achievementsFromFrames([new Uint8Array([1, 2, 3]), frame])
    // Only completed ones that exist on the site, with the site's casing.
    expect(await completedSiteIds(found)).toEqual(['explore_1'])
  })
  it('reads exporter achievement files', async () => {
    const doc = {
      format: 'nte-achievement-export',
      categories: {
        explore: [{ id: 'explore_2', completed: true, status: 'completed', progress: 1 }],
        battle: [{ id: 'Battle_25', completed: false, status: 'in_progress', progress: 20 }],
      },
    }
    const found = parseAchievementExport(JSON.stringify(doc))!
    expect(found).toHaveLength(2)
    expect(await completedSiteIds(found)).toEqual(['explore_2'])
    expect(parseAchievementExport('{"format":"nte-history-export"}')).toBeNull()
  })
})
