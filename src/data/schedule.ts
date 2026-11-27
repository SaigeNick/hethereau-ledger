/**
 * Limited character banner schedule. Dates are not in the game files, so this
 * list is kept by hand from official version previews (start = maintenance day,
 * end = the day the next phase starts). Add each new phase here.
 */
export interface BannerRun {
  banner: string
  version: string
  start: string
  end: string
  rerun?: boolean
}

export const RUNS: BannerRun[] = [
  { banner: 'Lottery_Nanali', version: '1.0', start: '2026-04-29', end: '2026-05-13' },
  { banner: 'Lottery_Xun', version: '1.0', start: '2026-05-13', end: '2026-06-03' },
  { banner: 'Lottery_AnHunQu', version: '1.1', start: '2026-06-03', end: '2026-06-24' },
  { banner: 'Lottery_Kaesi', version: '1.1', start: '2026-06-24', end: '2026-07-08' },
  { banner: 'Lottery_ZhenHong', version: '1.2', start: '2026-07-08', end: '2026-07-29' },
  { banner: 'Lottery_Yiluoyi', version: '1.2', start: '2026-07-29', end: '2026-08-19' },
  { banner: 'Lottery_Canhong', version: '1.3', start: '2026-08-19', end: '2026-09-09' },
  { banner: 'Lottery_Nanali', version: '1.3', start: '2026-08-19', end: '2026-09-09', rerun: true },
  { banner: 'Lottery_LingKe', version: '1.3', start: '2026-09-09', end: '2026-09-30' },
  { banner: 'Lottery_Xun', version: '1.3', start: '2026-09-09', end: '2026-09-30', rerun: true },
  { banner: 'Lottery_HeiYu', version: '1.4', start: '2026-09-30', end: '2026-10-21' },
  { banner: 'Lottery_AnHunQu', version: '1.4', start: '2026-09-30', end: '2026-10-21', rerun: true },
  { banner: 'Lottery_MingYin', version: '1.4', start: '2026-10-21', end: '2026-11-11' },
  { banner: 'Lottery_YeErMu', version: '1.5', start: '2026-11-11', end: '2026-12-02' },
  { banner: 'Lottery_ZhenHong', version: '1.5', start: '2026-11-11', end: '2026-12-02', rerun: true },
  { banner: 'Lottery_Exe', version: '1.5', start: '2026-12-02', end: '2026-12-23' },
  { banner: 'Lottery_Kaesi', version: '1.5', start: '2026-12-02', end: '2026-12-23', rerun: true },
]

/** In-game banner titles (ST_Ui Lottery_Kachimingcheng_*). */
export const TITLES: Record<string, string> = {
  Lottery_Nanali: 'The Ichi-daime',
  Lottery_Xun: 'Misty Tipsy Style',
  Lottery_AnHunQu: 'Fading Reverie',
  Lottery_Kaesi: 'Forsaken Path',
  Lottery_ZhenHong: 'Before the Dawn',
  Lottery_Yiluoyi: 'The Lifeline',
  Lottery_Canhong: 'Alluring Shadows',
  Lottery_LingKe: 'Surfing All Channels!',
  Lottery_HeiYu: 'Foretold Finale',
  Lottery_MingYin: 'Dazzling Star',
  Lottery_YeErMu: 'Android Dreams',
  Lottery_Exe: 'Offline Equations',
}
