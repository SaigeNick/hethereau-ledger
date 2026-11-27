/** Ukrainian plural: 1 кидок, 2 кидки, 5 кидків. */
export function pluralUk(n: number, one: string, few: string, many: string) {
  const a = n % 10
  const b = n % 100
  if (a === 1 && b !== 11) return `${n} ${one}`
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return `${n} ${few}`
  return `${n} ${many}`
}
export const rollsUk = (n: number) => pluralUk(n, 'кидок', 'кидки', 'кидків')
export const pullsUk = (n: number) => pluralUk(n, 'крутка', 'крутки', 'круток')
export const daysUk = (n: number) => pluralUk(n, 'день', 'дні', 'днів')
