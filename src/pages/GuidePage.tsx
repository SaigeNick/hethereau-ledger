import { Link } from 'react-router-dom'
import { useI18n, type Lang } from '../lib/i18n'

/**
 * How the NTE gacha works, with numbers from community datamining guides.
 * Update here when Hotta changes the rules; the tracker logic lives in lib/banners.ts.
 */
type Row = [string, string, string]
interface Section {
  id: string
  title: string
  body: string[]
  table?: { head: Row; rows: Row[] }
}

const TILES_UK: Row[] = [
  ['Journey Together', '10.86%', 'Гарантовано персонаж на клітинці: S 1.19%, A 9.67%'],
  ['Apprentice Chest', '45.93%', 'S 0.2%, інакше B-Arc'],
  ['Hero Chest', '20.07%', 'S 3%, інакше B-Arc, плюс 2 Warp Pieces'],
  ['Lost Piece Box', '15.47%', 'Lost Pieces'],
  ['Arc-light Mystery Box', '3.31%', 'Випадковий A-Arc'],
  ['Slumberland', '3.15%', 'Наздожени Накупеду за 3 кидки — 30 Warp Pieces'],
  ['Warp Piece Box', '2.37%', 'Warp Pieces'],
  ['Roll Again', '1.57%', 'Додаткові кубики'],
  ['Multiple Surprises', '0.38%', 'Додаткові кубики'],
]
const TILES_EN: Row[] = [
  ['Journey Together', '10.86%', 'The character on the tile: S 1.19%, A 9.67%'],
  ['Apprentice Chest', '45.93%', 'S 0.2%, otherwise a B Arc'],
  ['Hero Chest', '20.07%', 'S 3%, otherwise a B Arc, plus 2 Warp Pieces'],
  ['Lost Piece Box', '15.47%', 'Lost Pieces'],
  ['Arc-light Mystery Box', '3.31%', 'A random A Arc'],
  ['Slumberland', '3.15%', 'Catch Nacupeda within 3 rolls for 30 Warp Pieces'],
  ['Warp Piece Box', '2.37%', 'Warp Pieces'],
  ['Roll Again', '1.57%', 'Extra dice'],
  ['Multiple Surprises', '0.38%', 'Extra dice'],
]

const CONTENT: Record<Lang, { title: string; lead: string; sources: string; sections: Section[] }> = {
  uk: {
    title: 'Як працює гача NTE',
    lead: 'Гача тут — настільна гра. Ви кидаєте кубик, фішка проходить 1–6 клітинок, і ви отримуєте те, що лежить на клітинці. Нижче всі цифри, з якими рахує трекер.',
    sources: 'Цифри зібрані зі спільнотних гайдів і можуть змінитися з патчами.',
    sections: [
      {
        id: 'board',
        title: 'Дошка персонажів',
        body: [
          'Базовий шанс на S-персонажа — 0.99% за кидок. Разом із гарантом виходить у середньому 1.87%, тобто приблизно раз на 53 кидки.',
          'Якщо 70 кидків поспіль без S-персонажа, дошка змінюється: S-клітинок стає набагато більше, і шанс росте до 19.59% за кидок.',
          '90-й кидок гарантує S-персонажа. На лімітованій дошці 50/50 немає: це завжди персонаж банера. Гарант спільний для всіх лімітованих банерів і переходить на наступні.',
          'Кожні 10 кидків гра дає бонусну нагороду A-класу: 20% персонаж, 80% Arc. В історії вона позначена як бонус і в гарант не рахується.',
        ],
      },
      {
        id: 'tiles',
        title: 'Клітинки дошки',
        body: ['Шанс потрапити на клітинку кожного типу і що вона дає.'],
        table: { head: ['Клітинка', 'Шанс', 'Що дає'], rows: TILES_UK },
      },
      {
        id: 'standard',
        title: 'Стандартна дошка',
        body: [
          'Ті самі шанси й гарант 90, але свій окремий лічильник. Кидки — за Fabricated Dice (на лімітованій дошці — Solid Dice).',
          'Після 50 кидків можна один раз вибрати S-персонажа: Sakiri, Daffodill, Baicang, Jiuyuan, Fadia або Hathor. Перші п’ять мультикруток коштують 8 кубиків замість 10.',
        ],
      },
      {
        id: 'skins',
        title: 'Скіни: вбрання, глайдери, скіни авто',
        body: [
          'На кожному лімітованому банері є пороги: 50 кидків — глайдер, 120 — скін авто (Livery), 200 — вбрання персонажа.',
          'Скіни можуть випасти й раніше прямо з дошки: вбрання з шансом 0.33%, з гарантом 0.68%. Трекер показує такі випадіння окремо як рідкісні.',
          'Чи зберігається прогрес порогів після закінчення банера, гайди пишуть по-різному. Розраховуйте на те, що ні.',
        ],
      },
      {
        id: 'arc',
        title: 'Arc Miracle Box (зброя)',
        body: [
          'Лише крутки по 10 за Tri-Key. Шанс на Arc S-класу — 3%, разом із гарантом 4.19%. A-клас — 7% (13.47%).',
          'Коли випадає Arc S-класу, з шансом 25% це UP Arc банера. S-клас гарантований на 6-й десятці (60 круток), UP Arc — на 8-й (80). Гарант переходить між банерами.',
        ],
      },
      {
        id: 'mystery',
        title: 'Mystery Box',
        body: [
          'Коробка на 15 нагород без повторів: за 15 відкриттів ви гарантовано отримуєте все, зокрема транспорт і вбрання.',
          'Кожне наступне відкриття дорожче. Платити можна Fons або Annulith. У деяких коробках машина не може випасти в перших п’яти відкриттях.',
        ],
      },
      {
        id: 'tracker',
        title: 'Як рахує трекер',
        body: [
          'Круткою вважається лише кидок кубика. Бонус кожні 10 кидків і Схованка Nacupeda показуються в історії, але гарант не змінюють.',
          '«Удача» порівнює, як часто S-клас випадав у вас у завершених циклах, із загальним шансом гри: 1.87% для дошок, 4.19% для Arc.',
        ],
      },
    ],
  },
  en: {
    title: 'How the NTE gacha works',
    lead: 'The gacha is a board game. You roll a die, your piece moves 1–6 tiles, and you get whatever is on the tile. These are the numbers the tracker uses.',
    sources: 'Numbers come from community guides and may change with patches.',
    sections: [
      {
        id: 'board',
        title: 'Character boards',
        body: [
          'The base S rate is 0.99% per roll. Including pity it averages 1.87%, about one S every 53 rolls.',
          'After 70 rolls without an S the board changes: far more S tiles, and the rate rises to 19.59% per roll.',
          'Roll 90 guarantees an S. The limited board has no 50/50: every S is the featured character. Pity is shared by all limited banners and carries over.',
          'Every 10 rolls the game hands out a bonus A reward: 20% a character, 80% an Arc. History marks it as a bonus and it does not count for pity.',
        ],
      },
      {
        id: 'tiles',
        title: 'Board tiles',
        body: ['How likely you are to land on each tile type, and what it gives.'],
        table: { head: ['Tile', 'Chance', 'Reward'], rows: TILES_EN },
      },
      {
        id: 'standard',
        title: 'Standard board',
        body: [
          'Same odds and 90 pity, with its own separate counter. Paid with Fabricated Dice.',
          'After 50 rolls you pick one S once: Sakiri, Daffodill, Baicang, Jiuyuan, Fadia or Hathor. The first five 10-rolls cost 8 dice instead of 10.',
        ],
      },
      {
        id: 'skins',
        title: 'Skins: outfits, gliders, liveries',
        body: [
          'Each limited banner has milestones: 50 pulls for a glider, 120 for a vehicle livery, 200 for the character outfit.',
          'Skins can also drop early from the board: outfits at 0.33%, 0.68% with pity. The tracker lists those drops separately as rare.',
          'Guides disagree on whether milestone progress survives the end of the banner. Assume it does not.',
        ],
      },
      {
        id: 'arc',
        title: 'Arc Miracle Box (weapons)',
        body: [
          '10-pulls only, paid with Tri-Keys. S rate 3%, 4.19% with pity. A 7% (13.47%).',
          'When an S drops, it is the featured Arc 25% of the time. An S is guaranteed on the 6th 10-pull (60 pulls), the featured Arc on the 8th (80). Pity carries over between banners.',
        ],
      },
      {
        id: 'mystery',
        title: 'Mystery Box',
        body: [
          'A box of 15 rewards with no repeats: 15 draws guarantee everything, including the vehicle and outfits.',
          'Every draw costs more than the last. You pay with Fons or Annulith. In some boxes the car cannot drop in the first five draws.',
        ],
      },
      {
        id: 'tracker',
        title: 'How the tracker counts',
        body: [
          'Only dice rolls count as pulls. The every-10 bonus and the chase reward show in history but never change pity.',
          'Luck compares how often you got an S in finished cycles with the game’s overall rate: 1.87% on boards, 4.19% for Arcs.',
        ],
      },
    ],
  },
}

const SOURCES = [
  ['Prydwen: Gacha System', 'https://www.prydwen.gg/neverness-to-everness/guides/gacha-system'],
  ['GameWith: Gacha System — Pity and Drop Rates', 'https://gamewith.net/nte/74098'],
  ['GameWith: Neon Rift (Draco) Gacha Guide', 'https://gamewith.net/nte/76663'],
]

export function GuidePage() {
  const { lang } = useI18n()
  const c = CONTENT[lang]
  return (
    <article className="guide">
      <h1>{c.title}</h1>
      <p className="lead">{c.lead}</p>
      <nav className="guide-toc" aria-label={c.title}>
        {c.sections.map((s) => (
          <a key={s.id} href={`#/guide`} onClick={(e) => (e.preventDefault(), document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }))}>
            {s.title}
          </a>
        ))}
      </nav>
      {c.sections.map((s) => (
        <section key={s.id} id={s.id}>
          <h2>{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {s.table && (
            <div className="table-scroll">
              <table className="history guide-table">
                <thead>
                  <tr>
                    {s.table.head.map((h) => (
                      <th key={h} className={h === s.table!.head[1] ? 'num' : ''}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.rows.map((r) => (
                    <tr key={r[0]}>
                      <td className="nowrap">{r[0]}</td>
                      <td className="num">{r[1]}</td>
                      <td>{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
      <section>
        <p className="note muted">{c.sources}</p>
        <ul className="sources">
          {SOURCES.map(([title, url]) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                {title}
              </a>
            </li>
          ))}
        </ul>
        <p>
          <Link to="/">{lang === 'uk' ? 'До огляду' : 'Back to overview'}</Link>
        </p>
      </section>
    </article>
  )
}
