import { describe, expect, it } from 'vitest'
import { avatarOf } from './profileInfo'
import { normalizeRegion } from './regions'
import { emptyRecords, type Profile } from './types'

describe('regions', () => {
  it('reads our codes and exporter values', () => {
    expect(normalizeRegion('EU')).toBe('EU')
    expect(normalizeRegion('Europe')).toBe('EU')
    expect(normalizeRegion('NA')).toBe('AM')
    expect(normalizeRegion('America')).toBe('AM')
    expect(normalizeRegion('Asia')).toBe('AS')
    expect(normalizeRegion('SEA')).toBe('SEA')
    expect(normalizeRegion('Southeast Asia')).toBe('SEA')
    expect(normalizeRegion('')).toBeUndefined()
    expect(normalizeRegion('mars')).toBeUndefined()
  })
})

describe('avatar', () => {
  const base: Profile = { id: 'p', name: 'X', records: emptyRecords(), updatedAt: '' }
  it('is empty without history and no pick', () => {
    expect(avatarOf(base)).toBeNull()
  })
  it('uses the picked character', () => {
    expect(avatarOf({ ...base, avatar: '1003' })?.id).toBe('1003')
  })
})
