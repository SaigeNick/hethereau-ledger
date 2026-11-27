/**
 * What pulls would cost in money. One pull on any banner is 160 Annulith; the
 * biggest regular pack is 6480+1600 Riftcrystal for 99.99, and Riftcrystal
 * converts to Annulith 1:1. Free Annulith counts too, so this is a value, not
 * what the player actually paid.
 */
export const ANNULITH_PER_PULL = 160
const PACK_PRICE = 99.99
const PACK_ANNULITH = 6480 + 1600
export const EUR_PER_PULL = (ANNULITH_PER_PULL * PACK_PRICE) / PACK_ANNULITH

export function pullValue(pulls: number) {
  return { annulith: pulls * ANNULITH_PER_PULL, eur: pulls * EUR_PER_PULL }
}

export function fmtEur(eur: number, lang: 'uk' | 'en') {
  return new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(eur)
}
