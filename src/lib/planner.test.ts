import { describe, expect, it } from 'vitest'
import { chanceOfCopies, plan, rollsToGuarantee } from './planner'

describe('planner', () => {
  it('is certain at hard pity and impossible with no rolls', () => {
    expect(chanceOfCopies(90, 0, 1)[0]).toBeCloseTo(1, 10)
    expect(chanceOfCopies(0, 40, 1)[0]).toBe(0)
    expect(chanceOfCopies(1, 89, 1)[0]).toBeCloseTo(1, 10)
  })
  it('matches the base rate for one roll', () => {
    expect(chanceOfCopies(1, 0, 1)[0]).toBeCloseTo(0.0099, 6)
  })
  it('is monotonic and copies are ordered', () => {
    const a = chanceOfCopies(120, 10, 3)
    expect(a[0]).toBeGreaterThan(a[1])
    expect(a[1]).toBeGreaterThan(a[2])
    expect(chanceOfCopies(100, 10, 1)[0]).toBeGreaterThan(chanceOfCopies(60, 10, 1)[0])
  })
  it('two copies are certain at 180 rolls', () => {
    expect(chanceOfCopies(180, 0, 2)[1]).toBeCloseTo(1, 10)
    expect(rollsToGuarantee(30, 2)).toBe(150)
  })
  it('counts Annulith, dice and income', () => {
    const r = plan({ pity: 9, annulith: 1600, dice: 5, dailyAnnulith: 160, days: 10, copies: 1 })
    expect(r.rolls).toBe(25)
    expect(r.missingRolls).toBe(81 - 25)
  })
})
