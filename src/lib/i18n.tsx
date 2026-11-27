import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'uk' | 'en'

const uk = {
  'nav.overview': 'Огляд',
  'nav.import': 'Імпорт',
  'nav.guide': 'Як працює гача',
  'nav.profile': 'Профіль',
  'lang.switch': 'English',

  'pool.Lottery_LimitedCharacter': 'Лімітована дошка',
  'pool.Lottery_Permanent': 'Стандартна дошка',
  'pool.Arc_MiracleBox': 'Arc Miracle Box',
  'pool.Gashapon_MysteryBox': 'Mystery Box',
  'poolhint.Lottery_LimitedCharacter': 'Гарант спільний для всіх лімітованих банерів і переходить далі. 50/50 немає: кожен S — персонаж банера.',
  'poolhint.Lottery_Permanent': 'Окремий гарант. Після 50 кидків — вибір одного S-персонажа.',
  'poolhint.Arc_MiracleBox': 'Лише крутки по 10. S гарантовано за 60 круток, Arc банера — за 80.',
  'poolhint.Gashapon_MysteryBox': 'Коробка на 15 нагород без повторів, тому окремого гаранту немає.',

  'stat.pity': 'Зараз на гаранті',
  'stat.pityOf': 'з {n}',
  'stat.total': 'Усього круток',
  'stat.sCount': 'Отримано S',
  'stat.avg': 'Середній гарант S',
  'stat.luck': 'Удача',
  'stat.bonus': 'Бонусні нагороди',
  'stat.bonusNote': 'A кожні 10 кидків, у гарант не йдуть',
  'stat.typical': 'зазвичай близько {n}',
  'luck.better': 'на {n}% частіше за середнє',
  'luck.worse': 'на {n}% рідше за середнє',
  'luck.even': 'рівно як у середньому',
  'luck.none': 'з’явиться після першого S',
  'luck.note': 'Порівнюю ваші завершені цикли з офіційним загальним шансом {rate}%.',

  'board.title': 'Дошка гаранту',
  'board.legendPulled': 'кидки з останнього S',
  'board.legendSoft': 'після {n} кидка дошка змінюється і шанс на S росте',
  'board.legendHard': 'на {n} — гарантований S',
  'board.empty': 'Тут з’явиться ваш шлях до наступного S.',
  'board.aria': '{n} з {max} круток до гаранту',

  'overview.title': 'Ваші крутки',
  'overview.empty.title': 'Тут поки порожньо',
  'overview.empty.body': 'Завантажте історію круток з гри або спробуйте сайт на демо-даних.',
  'overview.empty.import': 'Завантажити історію',
  'overview.empty.demo': 'Спробувати демо',
  'overview.lastS': 'Останній S: {name}, на {n}-й крутці',
  'overview.noS': 'S ще не випадав',
  'overview.open': 'Детальніше про «{pool}»',
  'overview.noData': 'Немає даних',

  'banner.drops': 'Ваші S',
  'banner.dropsEmpty': 'Поки жодного S. Усе попереду.',
  'banner.histTitle': 'На якій крутці випадали S',
  'banner.histNote': 'Кількість S за проміжками по {n} круток.',
  'banner.histTip': '{from}–{to}: {count} S',
  'banner.history': 'Історія',
  'banner.filter.all': 'Усе',
  'banner.filter.top': 'Лише S і A',
  'banner.col.time': 'Час',
  'banner.col.reward': 'Нагорода',
  'banner.col.rank': 'Ранг',
  'banner.col.pity': 'Гарант',
  'banner.more': 'Показати ще',
  'banner.manualTag': 'вручну',
  'banner.delete': 'Видалити запис',
  'banner.bonus.points_gift': 'бонус за 10 кидків',
  'banner.bonus.chase_reward': 'бонус погоні',
  'banner.rare': 'Рідкісні скіни',
  'banner.rareNote': 'Вбрання, глайдери та ліврії, що випали з кидків, а не за пороги 50/120/200.',
  'banner.back': 'До огляду',
  'banner.tableView': 'Таблиця',

  'import.title': 'Імпорт круток',
  'import.lead': 'Історію з гри дістає безкоштовна програма NTE History Exporter з відкритим кодом. Вона працює на ПК і лише читає мережевий трафік гри, нічого в грі не змінює.',
  'import.step1': 'Завантажте NTE History Exporter зі сторінки релізів на GitHub.',
  'import.step2': 'На Windows встановіть Npcap, якщо його ще немає.',
  'import.step3': 'Запустіть експортер до того, як натиснете «Старт» у головному меню гри.',
  'import.step4': 'У грі відкрийте історію потрібного банера і прогорніть усі сторінки до кінця, починаючи з першої.',
  'import.step5': 'Натисніть будь-яку клавішу в експортері. Файли з’являться в папці exports — перетягніть їх сюди.',
  'import.releases': 'Відкрити релізи експортера',
  'import.risk': 'Це сторонній інструмент, не від розробників гри. Користуйтеся ним на власний розсуд.',
  'import.drop': 'Перетягніть сюди JSON-файли або натисніть, щоб вибрати',
  'import.dropActive': 'Відпустіть, щоб завантажити',
  'import.reimport': 'Повторний імпорт безпечний: однакові крутки не задвоюються.',
  'import.result': '{pool}: додано {added}, вже були {dup}',
  'import.newProfile': 'Це інший ігровий акаунт, тому я створив для нього окремий профіль.',
  'import.err.not_json': '{file}: це не JSON. Виберіть файл з папки exports.',
  'import.err.wrong_format': '{file}: це не файл NTE History Exporter.',
  'import.err.unknown_pool': '{file}: цей банер сайт поки не підтримує.',
  'import.err.no_records': '{file}: у файлі немає круток, які вдалося прочитати.',
  'import.demo': 'Завантажити демо-дані',
  'import.demoNote': 'Демо-дані згенеровані за правилами гри. Їх можна будь-коли видалити в профілі.',

  'manual.title': 'Додати вручну',
  'manual.lead': 'Якщо експортер недоступний, запишіть крутки самі: скільки кидків зробили і що отримали в кінці.',
  'manual.pool': 'Банер',
  'manual.count': 'Скільки круток',
  'manual.gotTop': 'Остання крутка дала S',
  'manual.name': 'Що випало',
  'manual.namePh': 'Наприклад, Hotori',
  'manual.date': 'Дата',
  'manual.add': 'Додати крутки',
  'manual.added': 'Додано {n} круток.',
  'manual.unknown': 'невідома нагорода',

  'profile.title': 'Профіль',
  'profile.name': 'Ім’я профілю',
  'profile.namePh': 'Як вас показувати іншим',
  'profile.uid': 'Ігровий UID',
  'profile.uidHidden': 'UID бачите лише ви, у посилання він не потрапляє.',
  'profile.region': 'Регіон',
  'profile.list': 'Профілі на цьому пристрої',
  'profile.switch': 'Перейти',
  'profile.current': 'зараз відкритий',
  'profile.add': 'Додати профіль',
  'profile.unnamed': 'Без імені',
  'profile.share': 'Поділитися профілем',
  'profile.shareLead': 'Створіть посилання, за яким інші побачать вашу статистику. Після нових імпортів натисніть «Оновити посилання».',
  'profile.shareCreate': 'Створити посилання',
  'profile.shareUpdate': 'Оновити посилання',
  'profile.shareRevoke': 'Видалити посилання',
  'profile.shareCopy': 'Скопіювати',
  'profile.shareCopied': 'Скопійовано',
  'profile.shareDone': 'Посилання оновлено.',
  'profile.shareRevoked': 'Посилання видалено.',
  'profile.shareOffline': 'Поширення працює лише на опублікованому сайті. У цій чернетці сервера ще немає.',
  'profile.shareError': 'Не вдалося зв’язатися з сервером. Перевірте інтернет і спробуйте ще раз.',
  'profile.backup': 'Резервна копія',
  'profile.backupLead': 'Дані живуть у цьому браузері. Збережіть копію, щоб перенести їх на інший пристрій.',
  'profile.export': 'Завантажити копію',
  'profile.restore': 'Відновити з копії',
  'profile.restored': 'Дані відновлено.',
  'profile.restoreBad': 'Цей файл не схожий на резервну копію Hethereau Ledger.',
  'profile.danger': 'Видалення',
  'profile.clearPool': 'Очистити «{pool}»',
  'profile.delete': 'Видалити цей профіль',
  'profile.confirm': 'Точно? Це не можна скасувати.',
  'profile.saveFailed': 'Браузер не дає зберігати дані. Зміни зникнуть після закриття сторінки.',

  'shared.loading': 'Завантажую профіль…',
  'shared.missing': 'Такого профілю немає. Можливо, посилання видалили.',
  'shared.updated': 'Оновлено {date}',
  'shared.own': 'Завести свій трекер',

  'footer.fan': 'Фан-сайт. Не пов’язаний з Hotta Studio чи Perfect World Games. Назви та зображення з гри належать їхнім власникам.',
  'footer.kofi': 'Підтримати на Ko-fi',
  'footer.kofiSoon': 'Сторінка Ko-fi скоро з’явиться',
  'rank.?': 'невідомо',
}

type Key = keyof typeof uk

const en: Record<Key, string> = {
  'nav.overview': 'Overview',
  'nav.import': 'Import',
  'nav.guide': 'How it works',
  'nav.profile': 'Profile',
  'lang.switch': 'Українська',

  'pool.Lottery_LimitedCharacter': 'Limited board',
  'pool.Lottery_Permanent': 'Standard board',
  'pool.Arc_MiracleBox': 'Arc Miracle Box',
  'pool.Gashapon_MysteryBox': 'Mystery Box',
  'poolhint.Lottery_LimitedCharacter': 'Pity is shared by all limited banners and carries over. No 50/50: every S is the featured character.',
  'poolhint.Lottery_Permanent': 'Separate pity. After 50 rolls you pick one S character.',
  'poolhint.Arc_MiracleBox': '10-pulls only. An S within 60 pulls, the featured Arc within 80.',
  'poolhint.Gashapon_MysteryBox': 'A box of 15 rewards with no repeats, so there is no pity to track.',

  'stat.pity': 'Current pity',
  'stat.pityOf': 'of {n}',
  'stat.total': 'Total pulls',
  'stat.sCount': 'S drops',
  'stat.avg': 'Average S pity',
  'stat.luck': 'Luck',
  'stat.bonus': 'Bonus rewards',
  'stat.bonusNote': 'the A every 10 rolls; not counted for pity',
  'stat.typical': 'typically about {n}',
  'luck.better': '{n}% more often than average',
  'luck.worse': '{n}% less often than average',
  'luck.even': 'exactly average',
  'luck.none': 'shows up after your first S',
  'luck.note': 'Compares your finished cycles with the official overall rate of {rate}%.',

  'board.title': 'Pity board',
  'board.legendPulled': 'rolls since your last S',
  'board.legendSoft': 'after roll {n} the board changes and S odds go up',
  'board.legendHard': 'roll {n} is a guaranteed S',
  'board.empty': 'Your path to the next S will show up here.',
  'board.aria': '{n} of {max} pulls towards pity',

  'overview.title': 'Your pulls',
  'overview.empty.title': 'Nothing here yet',
  'overview.empty.body': 'Import your pull history from the game, or try the site with demo data.',
  'overview.empty.import': 'Import history',
  'overview.empty.demo': 'Try the demo',
  'overview.lastS': 'Last S: {name}, on pull {n}',
  'overview.noS': 'No S yet',
  'overview.open': 'More about {pool}',
  'overview.noData': 'No data',

  'banner.drops': 'Your S drops',
  'banner.dropsEmpty': 'No S yet. It is coming.',
  'banner.histTitle': 'Which pull your S drops landed on',
  'banner.histNote': 'S drops per {n}-pull range.',
  'banner.histTip': '{from}–{to}: {count} S',
  'banner.history': 'History',
  'banner.filter.all': 'All',
  'banner.filter.top': 'S and A only',
  'banner.col.time': 'Time',
  'banner.col.reward': 'Reward',
  'banner.col.rank': 'Rank',
  'banner.col.pity': 'Pity',
  'banner.more': 'Show more',
  'banner.manualTag': 'manual',
  'banner.delete': 'Delete entry',
  'banner.bonus.points_gift': 'every-10 bonus',
  'banner.bonus.chase_reward': 'chase bonus',
  'banner.rare': 'Rare skins',
  'banner.rareNote': 'Outfits, gliders and liveries that dropped from rolls, not from the 50/120/200 milestones.',
  'banner.back': 'Back to overview',
  'banner.tableView': 'Table',

  'import.title': 'Import pulls',
  'import.lead': 'Your history comes from NTE History Exporter, a free open-source tool. It runs on PC and only reads the game’s network traffic; it changes nothing in the game.',
  'import.step1': 'Download NTE History Exporter from its GitHub releases page.',
  'import.step2': 'On Windows, install Npcap if you do not have it yet.',
  'import.step3': 'Start the exporter before you press Start on the game’s main menu.',
  'import.step4': 'In game, open the banner history and scroll through every page, starting from page one.',
  'import.step5': 'Press any key in the exporter. Files appear in the exports folder; drop them here.',
  'import.releases': 'Open exporter releases',
  'import.risk': 'This is a third-party tool, not made by the game developers. Use it at your own discretion.',
  'import.drop': 'Drop JSON files here, or click to choose',
  'import.dropActive': 'Release to import',
  'import.reimport': 'Re-importing is safe: the same pulls are never counted twice.',
  'import.result': '{pool}: {added} added, {dup} already there',
  'import.newProfile': 'This is a different game account, so it got its own profile.',
  'import.err.not_json': '{file}: not a JSON file. Pick a file from the exports folder.',
  'import.err.wrong_format': '{file}: not an NTE History Exporter file.',
  'import.err.unknown_pool': '{file}: this banner is not supported yet.',
  'import.err.no_records': '{file}: no readable pulls in this file.',
  'import.demo': 'Load demo data',
  'import.demoNote': 'Demo data is generated with the game’s rules. You can delete it any time on the profile page.',

  'manual.title': 'Add by hand',
  'manual.lead': 'No exporter? Log pulls yourself: how many rolls you made and what the last one gave.',
  'manual.pool': 'Banner',
  'manual.count': 'Number of pulls',
  'manual.gotTop': 'The last pull was an S',
  'manual.name': 'What dropped',
  'manual.namePh': 'For example, Hotori',
  'manual.date': 'Date',
  'manual.add': 'Add pulls',
  'manual.added': 'Added {n} pulls.',
  'manual.unknown': 'unknown reward',

  'profile.title': 'Profile',
  'profile.name': 'Profile name',
  'profile.namePh': 'How others see you',
  'profile.uid': 'Game UID',
  'profile.uidHidden': 'Only you see your UID; it is never put in a shared link.',
  'profile.region': 'Region',
  'profile.list': 'Profiles on this device',
  'profile.switch': 'Open',
  'profile.current': 'open now',
  'profile.add': 'Add profile',
  'profile.unnamed': 'Unnamed',
  'profile.share': 'Share your profile',
  'profile.shareLead': 'Create a link that shows your stats to others. After new imports, press Update link.',
  'profile.shareCreate': 'Create link',
  'profile.shareUpdate': 'Update link',
  'profile.shareRevoke': 'Delete link',
  'profile.shareCopy': 'Copy',
  'profile.shareCopied': 'Copied',
  'profile.shareDone': 'Link updated.',
  'profile.shareRevoked': 'Link deleted.',
  'profile.shareOffline': 'Sharing works on the published site only. This draft has no server yet.',
  'profile.shareError': 'Could not reach the server. Check your connection and try again.',
  'profile.backup': 'Backup',
  'profile.backupLead': 'Your data lives in this browser. Save a copy to move it to another device.',
  'profile.export': 'Download backup',
  'profile.restore': 'Restore from backup',
  'profile.restored': 'Data restored.',
  'profile.restoreBad': 'This file does not look like a Hethereau Ledger backup.',
  'profile.danger': 'Delete data',
  'profile.clearPool': 'Clear {pool}',
  'profile.delete': 'Delete this profile',
  'profile.confirm': 'Are you sure? This cannot be undone.',
  'profile.saveFailed': 'This browser blocks saving. Changes will be lost when you close the page.',

  'shared.loading': 'Loading profile…',
  'shared.missing': 'This profile does not exist. The link may have been deleted.',
  'shared.updated': 'Updated {date}',
  'shared.own': 'Start your own tracker',

  'footer.fan': 'Fan site. Not affiliated with Hotta Studio or Perfect World Games. Game names and images belong to their owners.',
  'footer.kofi': 'Support on Ko-fi',
  'footer.kofiSoon': 'Ko-fi page coming soon',
  'rank.?': 'unknown',
}

const DICTS: Record<Lang, Record<Key, string>> = { uk, en }
export type TKey = Key
type T = (key: Key, vars?: Record<string, string | number>) => string

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: T; fmtDate: (s: string) => string } | null>(null)

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('hethereau-ledger.lang')
    if (saved === 'uk' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  return navigator.language?.toLowerCase().startsWith('uk') ? 'uk' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('hethereau-ledger.lang', lang)
    } catch {
      /* ignore */
    }
  }, [lang])
  const value = useMemo(() => {
    const dict = DICTS[lang]
    const t: T = (key, vars) => {
      let s = dict[key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
      return s
    }
    const fmt = new Intl.DateTimeFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const fmtDate = (s: string) => {
      const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'))
      return Number.isNaN(d.getTime()) ? s : fmt.format(d)
    }
    return { lang, setLang, t, fmtDate }
  }, [lang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n() {
  const v = useContext(Ctx)
  if (!v) throw new Error('I18nProvider missing')
  return v
}
