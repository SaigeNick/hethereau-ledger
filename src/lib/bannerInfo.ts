/**
 * Limited banners by their in-game pool ID, with the featured S character.
 * There is no 50/50, so the featured character is also inferred from any S a
 * player got on that banner; this list covers banners nobody pulled an S on.
 */
export const FEATURED: Record<string, string> = {
  Lottery_AnHunQu: '1004',
  Lottery_Kaesi: '1071',
  Lottery_ZhenHong: '1076',
  Lottery_Yiluoyi: '1075',
  Lottery_Canhong: '1036',
  Lottery_Nanali: '1010',
  Lottery_LingKe: '1072',
  Lottery_Xun: '1052',
  Lottery_HeiYu: '1042',
  Lottery_MingYin: '1057',
  Lottery_YeErMu: '1090',
  Lottery_Exe: '1074',
}

/** Skin milestones on every limited banner: glider, livery, outfit. */
export const MILESTONES = [50, 120, 200] as const
