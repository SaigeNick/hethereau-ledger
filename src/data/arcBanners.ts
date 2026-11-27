/**
 * Featured S-Class Arc of each Arc banner, from DT_ForkLotteryPoolData (icon path).
 * Add a line when a new Arc banner appears.
 */
export const ARC_FEATURED: Record<string, string> = {
  ForkLottery_Nanali: 'fork_TigerTally',
  ForkLottery_Xun: 'fork_Time',
  ForkLottery_AnHunQu: 'fork_Rose',
  ForkLottery_Kaesi: 'fork_GoldWool',
  ForkLottery_Zhenhong: 'fork_LunarPhase',
  ForkLottery_Yiluoyi: 'fork_Door',
  ForkLottery_Canhong: 'fork_DemonBlade',
  ForkLottery_LingKe: 'fork_GoldRecord',
  ForkLottery_HeiYu: 'fork_twinbirds',
  ForkLottery_MingYin: 'fork_prism',
  ForkLottery_YeErMu: 'fork_elyms',
  ForkLottery_Exe: 'fork_exe',
}

/** The Arc banner that runs next to a character banner (names differ only in case). */
export function arcBannerOf(characterBanner: string) {
  const tail = characterBanner.replace(/^Lottery_/, '').toLowerCase()
  return Object.keys(ARC_FEATURED).find((k) => k.replace(/^ForkLottery_/, '').toLowerCase() === tail) ?? null
}
