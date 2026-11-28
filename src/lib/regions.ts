/** The four global NTE servers. Each account lives on one of them for good. */
export const REGIONS = ['EU', 'AM', 'AS', 'SEA'] as const
export type Region = (typeof REGIONS)[number]

export const REGION_NAMES: Record<'uk' | 'en', Record<Region, string>> = {
  uk: { EU: 'Європа', AM: 'Америка', AS: 'Азія', SEA: 'Пд.-Сх. Азія' },
  en: { EU: 'Europe', AM: 'America', AS: 'Asia', SEA: 'Southeast Asia' },
}

/** Accepts our codes and what exporters write ("EU", "NA", "Asia", "SEA"…). */
export function normalizeRegion(s?: string): Region | undefined {
  const v = (s ?? '').trim().toUpperCase()
  if (!v) return undefined
  if (v === 'SEA' || v.startsWith('SOUTHEAST') || v.startsWith('SE')) return 'SEA'
  if (v.startsWith('EU')) return 'EU'
  if (v.startsWith('AM') || v === 'NA' || v === 'US' || v === 'SA') return 'AM'
  if (v.startsWith('AS') || v === 'JP' || v === 'KR' || v === 'TW') return 'AS'
  return undefined
}
