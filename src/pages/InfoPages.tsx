import { Fragment, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { CONTACT_EMAIL, REPO_URL } from '../config'
import { useI18n, type Lang } from '../lib/i18n'

/**
 * FAQ, privacy policy and terms. Plain text with [label](url) links;
 * "{contact}" becomes the contact link from config.ts.
 * Keep these in step with what the code actually does (store.tsx, share API, sync.ps1).
 */
const UPDATED = '2026-11-27'

type Block = string | string[]
interface Section {
  id: string
  title: string
  body: Block[]
}
interface Doc {
  title: string
  lead: string
  sections: Section[]
}

const CONTACT_LINK = CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}` : `${REPO_URL}/issues`

function rich(text: string, lang: Lang): ReactNode {
  const contactLabel = CONTACT_EMAIL ? CONTACT_EMAIL : lang === 'uk' ? 'GitHub Issues' : 'GitHub Issues'
  const withContact = text.replaceAll('{contact}', `[${contactLabel}](${CONTACT_LINK})`)
  const parts = withContact.split(/\[([^\]]+)\]\(([^)]+)\)/g)
  return parts.map((p, i) => {
    if (i % 3 === 0) return <Fragment key={i}>{p}</Fragment>
    if (i % 3 === 2) return null
    const url = parts[i + 1]
    return url.startsWith('#/') ? (
      <Link key={i} to={url.slice(1)}>
        {p}
      </Link>
    ) : (
      <a key={i} href={url} target="_blank" rel="noreferrer">
        {p}
      </a>
    )
  })
}

function Blocks({ body, lang }: { body: Block[]; lang: Lang }) {
  return (
    <>
      {body.map((b, i) =>
        Array.isArray(b) ? (
          <ul key={i}>
            {b.map((li, j) => (
              <li key={j}>{rich(li, lang)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{rich(b, lang)}</p>
        ),
      )}
    </>
  )
}

function Updated({ lang }: { lang: Lang }) {
  const d = new Date(UPDATED + 'T12:00:00').toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return <p className="muted">{lang === 'uk' ? `Оновлено ${d}` : `Updated ${d}`}</p>
}

function DocPage({ doc }: { doc: Record<Lang, Doc> }) {
  const { lang } = useI18n()
  const c = doc[lang]
  return (
    <article className="guide legal">
      <h1>{c.title}</h1>
      <p className="lead">{rich(c.lead, lang)}</p>
      <Updated lang={lang} />
      {c.sections.map((s) => (
        <section key={s.id} id={s.id}>
          <h2>{s.title}</h2>
          <Blocks body={s.body} lang={lang} />
        </section>
      ))}
      <LegalNav />
    </article>
  )
}

function LegalNav() {
  const { lang } = useI18n()
  const uk = lang === 'uk'
  return (
    <nav className="legal-nav" aria-label={uk ? 'Інформація' : 'Information'}>
      <NavLink to="/faq">{uk ? 'Питання та відповіді' : 'FAQ'}</NavLink>
      <NavLink to="/privacy">{uk ? 'Конфіденційність' : 'Privacy'}</NavLink>
      <NavLink to="/terms">{uk ? 'Умови використання' : 'Terms of use'}</NavLink>
    </nav>
  )
}

/* ---------------- FAQ ---------------- */

interface QA {
  q: string
  a: Block[]
}
interface Faq {
  title: string
  lead: string
  groups: { title: string; items: QA[] }[]
}

const FAQ: Record<Lang, Faq> = {
  uk: {
    title: 'Питання та відповіді',
    lead: 'Коротко про те, що робить сайт, де лежать ваші дані і чого чекати від команди синхронізації.',
    groups: [
      {
        title: 'Про сайт',
        items: [
          {
            q: 'Що таке Hethereau Ledger?',
            a: [
              'Безкоштовний трекер круток для Neverness to Everness: історія, гарант до S, статистика удачі й етапи банерів. Зроблений гравцями для гравців.',
            ],
          },
          {
            q: 'Це офіційний сайт гри?',
            a: [
              'Ні. Це неофіційний фан-проєкт. Він не пов’язаний з Hotta Studio чи Perfect World Games, не схвалений і не підтримується ними. Neverness to Everness і всі матеріали гри належать їхнім власникам.',
            ],
          },
          {
            q: 'Це безкоштовно?',
            a: [
              'Так, повністю. Кнопка Ko-fi — це добровільна підтримка: вона нічого не відкриває й не дає переваг.',
            ],
          },
          {
            q: 'Наскільки точні шанси й правила в гайді?',
            a: [
              'Цифри взяті з гайдів спільноти та датамайну файлів гри, а не з офіційних джерел. Розробник може змінити правила будь-коли. Сприймайте статистику як орієнтир, а не як обіцянку.',
            ],
          },
        ],
      },
      {
        title: 'Ваші дані',
        items: [
          {
            q: 'Де зберігається моя історія?',
            a: [
              'Тільки у вашому браузері (localStorage) на цьому пристрої. На наш сервер вона не надсилається, поки ви самі не створите посилання на профіль. Для загальної статистики йдуть лише анонімні числа — див. нижче.',
              'Якщо очистити дані браузера, історія зникне. Зробіть резервну копію на сторінці [Профіль](#/profile) — це звичайний файл JSON.',
            ],
          },
          {
            q: 'Чи потрібен акаунт, логін або пароль?',
            a: [
              'Ні. Сайт ніколи не просить логін, пароль чи токени від гри або будь-якого іншого сервісу. Якщо хтось просить їх від імені Hethereau Ledger — це шахраї.',
            ],
          },
          {
            q: 'Хто бачить моє посилання на профіль?',
            a: [
              'Будь-хто, у кого є посилання. Воно містить назву профілю, регіон та історію круток. UID гри туди не потрапляє.',
              'Посилання можна оновити або видалити кнопкою на сторінці [Профіль](#/profile) того самого браузера, де ви його створили.',
            ],
          },
          {
            q: 'Як дивитися свої крутки з телефона?',
            a: [
              'Створіть посилання на сторінці [Профіль](#/profile) на ПК і відскануйте QR-код телефоном. Натисніть «Зберегти на цьому пристрої» — крутки з’являться на телефоні. Посилання оновлюється саме після кожного імпорту на ПК, а на телефоні достатньо відкрити його знову й натиснути «Оновити копію».',
              'Інший спосіб — підключити Google Drive на обох пристроях у [Профілі](#/profile). Тоді крутки синхронізуються через ваш власний Диск.',
            ],
          },
          {
            q: 'Я очистив браузер і не можу видалити своє посилання. Що робити?',
            a: ['Напишіть нам ({contact}) і вкажіть посилання — ми видалимо його вручну.'],
          },
          {
            q: 'Як працює «Ти удачливіший за X% гравців»?',
            a: [
              'Сайт анонімно надсилає лише числа з лімітованих банерів: скільки кидків і на якому кидку випала кожна S. Без імені, UID чи IP. З них рахуються середні значення спільноти й ваше місце серед гравців.',
              'Не хочете брати участь — вимкніть це на сторінці [Профіль](#/profile#stats), і ваші числа видаляться.',
            ],
          },
          {
            q: 'Ви використовуєте cookies, рекламу чи аналітику?',
            a: [
              'Ні. На сайті немає cookies, реклами, аналітики й сторонніх скриптів (крім входу Google, і лише якщо ви самі підключаєте Google Drive), а шрифти й картинки завантажуються з нашого ж домену. Подробиці — у [політиці конфіденційності](#/privacy).',
            ],
          },
        ],
      },
      {
        title: 'Команда синхронізації',
        items: [
          {
            q: 'Що саме робить команда?',
            a: [
              'Поки ви гортаєте історію круток у грі, вона читає вхідні мережеві пакети гри на вашому ПК і копіює в буфер обміну лише ті, в яких є історія круток. Потім ви вставляєте текст на сайт, і він розбирається прямо у браузері.',
              [
                'не змінює файли гри й не втручається в її процес чи пам’ять;',
                'нічого не надсилає ні на сервери гри, ні нам — лише відкриває сторінку імпорту;',
                'не автоматизує жодних дій у грі;',
                'код відкритий — його можна прочитати перед запуском: [sync.ps1](/sync.ps1).',
              ],
            ],
          },
          {
            q: 'Навіщо права адміністратора?',
            a: [
              'Windows дозволяє читати мережеві пакети лише програмам з правами адміністратора. Команда нічого не налаштовує в системі й не встановлює, а після роботи просто завершується.',
            ],
          },
          {
            q: 'Браузер не дає скопіювати команду. Чому?',
            a: [
              'Шахраї часто просять людей «вставити команду в PowerShell», тож деякі браузери, розширення й антивіруси блокують копіювання таких команд. Наша команда безпечна, а її код відкритий, проте захист цього не знає.',
              'Виділіть команду й скопіюйте вручну, наберіть її самі (вона коротка) або скачайте запускач hethereau-sync.cmd на сторінці [Імпорт](#/import). Windows може попередити про файл з інтернету: «Докладніше» → «Однаково запустити».',
            ],
          },
          {
            q: 'Чи треба щоразу гортати всю історію?',
            a: [
              'Ні. Уперше — до кінця. Потім достатньо відкрити сторінки з новими крутками і ще одну, яку сайт уже бачив. Якщо між імпортами лишиться прогалина, сайт попередить і скаже, до якої дати догорнути.',
            ],
          },
          {
            q: 'Мене можуть забанити?',
            a: [
              'Чесно: гарантувати не може ніхто, крім розробника. Правила NTE забороняють моди, зміну файлів гри, макроси й програми, що дають перевагу. Команда нічого з цього не робить: вона лише читає трафік, який і так приходить на ваш комп’ютер.',
              'Остаточне рішення завжди за розробником, тож ви користуєтеся командою на власний ризик. Якщо не хочете ризикувати зовсім, додавайте крутки вручну на сторінці [Імпорт](#/import).',
            ],
          },
          {
            q: 'Чому імпортувалися не всі крутки?',
            a: [
              'Команда бачить лише ті сторінки історії, які ви відкрили в грі, поки вона працювала, тож гортайте до самого кінця. Історія Arc і Mystery Box поки не підтримується — ми над цим працюємо. Відсутнє можна додати вручну.',
            ],
          },
        ],
      },
      {
        title: 'Інше',
        items: [
          {
            q: 'Звідки картинки персонажів і предметів?',
            a: [
              'З файлів гри, через відкритий датамайн спільноти. Усі права на них належать власникам гри. Якщо ви правовласник і хочете, щоб ми щось прибрали, напишіть ({contact}) — приберемо.',
            ],
          },
          {
            q: 'Знайшли помилку чи маєте ідею?',
            a: ['Напишіть у {contact}. Код сайту відкритий на [GitHub](' + REPO_URL + ').'],
          },
        ],
      },
    ],
  },
  en: {
    title: 'FAQ',
    lead: 'What the site does, where your data lives, and what to expect from the sync command.',
    groups: [
      {
        title: 'About the site',
        items: [
          {
            q: 'What is Hethereau Ledger?',
            a: [
              'A free pull tracker for Neverness to Everness: history, pity to the next S, luck stats and banner milestones. Made by players, for players.',
            ],
          },
          {
            q: 'Is this an official site?',
            a: [
              'No. It is an unofficial fan project. It is not affiliated with, endorsed or supported by Hotta Studio or Perfect World Games. Neverness to Everness and all game materials belong to their owners.',
            ],
          },
          {
            q: 'Is it free?',
            a: ['Yes, completely. The Ko-fi button is voluntary support; it unlocks nothing and gives no perks.'],
          },
          {
            q: 'How accurate are the rates and rules in the guide?',
            a: [
              'The numbers come from community guides and datamined game files, not official sources. The developer can change the rules at any time. Treat the stats as a guide, not a promise.',
            ],
          },
        ],
      },
      {
        title: 'Your data',
        items: [
          {
            q: 'Where is my history stored?',
            a: [
              'Only in your browser (localStorage) on this device. It is not sent to our server unless you create a profile link yourself. Community stats only receive anonymous numbers; see below.',
              'Clearing your browser data deletes it. Make a backup on the [Profile](#/profile) page; it is a plain JSON file.',
            ],
          },
          {
            q: 'Do I need an account, login or password?',
            a: [
              'No. The site never asks for a login, password or token for the game or any other service. Anyone asking for these on behalf of Hethereau Ledger is a scammer.',
            ],
          },
          {
            q: 'Who can see my profile link?',
            a: [
              'Anyone who has the link. It contains your profile name, region and pull history. Your game UID is not included.',
              'You can update or delete the link on the [Profile](#/profile) page in the same browser where you created it.',
            ],
          },
          {
            q: 'How do I see my pulls on my phone?',
            a: [
              'Create a link on the [Profile](#/profile) page on your PC and scan the QR code with your phone. Press “Save on this device” and your pulls appear on the phone. The link updates itself after every import on the PC; on the phone just open it again and press “Update the copy”.',
              'Another way is to connect Google Drive on both devices in [Profile](#/profile). Your pulls then sync through your own Drive.',
            ],
          },
          {
            q: 'I cleared my browser and can’t delete my link. What now?',
            a: ['Contact us ({contact}) with the link and we will delete it by hand.'],
          },
          {
            q: 'How does “You’re luckier than X% of players” work?',
            a: [
              'The site anonymously sends only numbers from the limited banners: how many rolls and the roll each S came on. No name, UID or IP. Community averages and your place among players are calculated from them.',
              'If you don’t want to take part, turn it off on the [Profile](#/profile#stats) page and your numbers are deleted.',
            ],
          },
          {
            q: 'Do you use cookies, ads or analytics?',
            a: [
              'No. There are no cookies, ads, analytics or third-party scripts (except Google sign-in, and only if you connect Google Drive yourself), and fonts and images load from our own domain. Details are in the [privacy policy](#/privacy).',
            ],
          },
        ],
      },
      {
        title: 'The sync command',
        items: [
          {
            q: 'What exactly does the command do?',
            a: [
              'While you scroll through your pull history in the game, it reads the game’s incoming network packets on your PC and copies only the ones that contain pull history to your clipboard. You then paste the text into the site, which decodes it right in your browser.',
              [
                'it does not change game files or touch the game process or its memory;',
                'it sends nothing to the game servers or to us; it only opens the import page;',
                'it does not automate anything in the game;',
                'the code is open, so you can read it before running it: [sync.ps1](/sync.ps1).',
              ],
            ],
          },
          {
            q: 'Why does it need administrator rights?',
            a: [
              'Windows only lets programs with administrator rights read network packets. The command installs nothing and changes no system settings; it simply exits when done.',
            ],
          },
          {
            q: 'My browser won’t let me copy the command. Why?',
            a: [
              'Scammers often ask people to “paste a command into PowerShell”, so some browsers, extensions and antivirus tools block copying such commands. Our command is safe and its code is open, but the protection can’t tell.',
              'Select the command and copy it by hand, type it yourself (it’s short), or download the hethereau-sync.cmd launcher on the [Import](#/import) page. Windows may warn about a file from the internet: More info → Run anyway.',
            ],
          },
          {
            q: 'Do I have to scroll the whole history every time?',
            a: [
              'No. The first time, scroll to the end. After that, open the pages with new pulls plus one the site has already seen. If a gap is left between imports, the site warns you and says how far back to go.',
            ],
          },
          {
            q: 'Can I get banned?',
            a: [
              'Honestly, only the developer can guarantee that. NTE’s rules forbid mods, changing game files, macros and programs that give an advantage. The command does none of these: it only reads traffic that already arrives on your computer.',
              'The final call is always the developer’s, so you use the command at your own risk. If you want zero risk, add pulls by hand on the [Import](#/import) page.',
            ],
          },
          {
            q: 'Why weren’t all my pulls imported?',
            a: [
              'The command only sees history pages you open in the game while it is running, so scroll all the way to the end. Arc and Mystery Box history isn’t supported yet; we’re working on it. You can add anything missing by hand.',
            ],
          },
        ],
      },
      {
        title: 'Other',
        items: [
          {
            q: 'Where do the character and item images come from?',
            a: [
              'From the game files, via an open community datamine. All rights belong to the game’s owners. If you are a rights holder and want something removed, contact us ({contact}) and we will remove it.',
            ],
          },
          {
            q: 'Found a bug or have an idea?',
            a: ['Tell us on {contact}. The site’s code is open on [GitHub](' + REPO_URL + ').'],
          },
        ],
      },
    ],
  },
}

export function FaqPage() {
  const { lang } = useI18n()
  const c = FAQ[lang]
  return (
    <article className="guide legal">
      <h1>{c.title}</h1>
      <p className="lead">{c.lead}</p>
      {c.groups.map((g) => (
        <section key={g.title}>
          <h2>{g.title}</h2>
          {g.items.map((it) => (
            <details key={it.q} className="faq">
              <summary>{it.q}</summary>
              <Blocks body={it.a} lang={lang} />
            </details>
          ))}
        </section>
      ))}
      <LegalNav />
    </article>
  )
}

/* ---------------- Privacy ---------------- */

const PRIVACY: Record<Lang, Doc> = {
  uk: {
    title: 'Політика конфіденційності',
    lead: 'Коротко: ми майже нічого не збираємо. Ваша історія живе у вашому браузері. На сервер потрапляють лише анонімні числа для загальної статистики (їх можна вимкнути) і те, чим ви самі вирішили поділитися.',
    sections: [
      {
        id: 'who',
        title: 'Хто відповідає за дані',
        body: [
          'Сайт веде приватна особа, автор проєкту (GitHub: SaigeNick). З будь-якими питаннями щодо ваших даних пишіть: {contact}.',
        ],
      },
      {
        id: 'browser',
        title: 'Що зберігається у вашому браузері',
        body: [
          'Сайт зберігає у localStorage вашого браузера:',
          [
            'профілі та історію круток, яку ви імпортували чи додали вручну;',
            'налаштування: мову, вигляд історії, значення калькулятора й вибір щодо загальної статистики;',
            'службові ключі посилань на профіль, щоб ви могли їх оновити чи видалити.',
          ],
          'Сама історія не залишає ваш пристрій, поки ви не створите посилання на профіль. Видалити їх можна на сторінці [Профіль](#/profile) або очистивши дані сайту в налаштуваннях браузера. Це сховище потрібне лише для роботи функцій, якими ви користуєтеся, тому окрема згода на нього не потрібна.',
        ],
      },
      {
        id: 'share',
        title: 'Посилання на профіль',
        body: [
          'Якщо ви натиснете «Створити посилання», на сервер буде надіслано назву профілю, регіон та історію круток, а після кожного нового імпорту посилання оновлюється автоматично. UID гри й службові ключі не надсилаються. Дані зберігаються у сховищі Cloudflare, доки ви не видалите посилання, і доступні будь-кому, хто має посилання.',
          'Підстава: ваша згода, яку ви даєте, створюючи посилання. Ви можете відкликати її будь-коли, видаливши посилання на сторінці [Профіль](#/profile) або написавши нам.',
        ],
      },
      {
        id: 'drive',
        title: 'Google Drive',
        body: [
          'Якщо ви підключите Google Drive, сайт прямо з вашого браузера зберігатиме копію всіх профілів і круток у прихованій папці застосунку на вашому Диску. Для цього потрібен лише дозвіл drive.appdata: сайт бачить тільки власний файл і не має доступу до інших ваших файлів. Ключ доступу живе лише у вкладці браузера, а файл не проходить через наш сервер, тож ми його не бачимо.',
          'Обробку даних на боці Google регулює [політика конфіденційності Google](https://policies.google.com/privacy). Відключити синхронізацію або видалити копію можна на сторінці [Профіль](#/profile), а скасувати доступ сайту — у [налаштуваннях акаунта Google](https://myaccount.google.com/permissions).',
        ],
      },
      {
        id: 'stats',
        title: 'Загальна статистика',
        body: [
          'Щоб показати, наскільки ви удачливі порівняно з іншими гравцями, сайт надсилає на сервер лише числа з лімітованих банерів: загальну кількість кидків і номер кидка, на якому випала кожна S. Разом з ними зберігається ідентифікатор — хеш внутрішнього номера вашої першої крутки, щоб повторне надсилання замінювало старі числа, а не дублювало їх. Імені, UID гри та IP-адреси там немає.',
          'Ці числа зберігаються в Cloudflare і видаляються через 180 днів без оновлень. Показуються лише в зведеному вигляді (кількість гравців, середні значення). Підстава: наш законний інтерес у тому, щоб показувати гравцям загальну статистику.',
          'Ви можете заперечити будь-коли: вимкніть «Загальна статистика» на сторінці [Профіль](#/profile#stats). Тоді вже надіслані числа видаляться, а нові не надсилатимуться.',
        ],
      },
      {
        id: 'abuse',
        title: 'Захист від зловживань',
        body: [
          'Щоб ніхто не засмічував сервер, ми рахуємо, скільки посилань і наборів статистики надіслано з однієї IP-адреси за годину. Для цього зберігається не сама адреса, а її хеш SHA-256, і він автоматично видаляється приблизно через годину. Підстава: наш законний інтерес у захисті сервісу.',
        ],
      },
      {
        id: 'hosting',
        title: 'Хостинг',
        body: [
          'Сайт розміщено на Cloudflare Pages. Як і будь-який хостинг, Cloudflare обробляє технічні дані запитів (IP-адресу, тип браузера, час), щоб доставити сторінку й захистити її від атак. Ми не отримуємо журналів відвідувань. Подробиці — у [політиці Cloudflare](https://www.cloudflare.com/privacypolicy/).',
        ],
      },
      {
        id: 'none',
        title: 'Чого ми не робимо',
        body: [
          [
            'не використовуємо cookies, рекламу, аналітику чи трекери;',
            'не завантажуємо сторонні скрипти, шрифти чи картинки (єдиний виняток — скрипт входу Google, і лише коли ви самі підключаєте Google Drive);',
            'не просимо й не зберігаємо логіни, паролі чи платіжні дані;',
            'не продаємо й не передаємо ваші дані.',
          ],
        ],
      },
      {
        id: 'sync',
        title: 'Команда синхронізації',
        body: [
          'Команда працює лише на вашому комп’ютері: вона копіює історію круток у ваш буфер обміну й нікуди її не надсилає. На сайт дані потрапляють тільки тоді, коли ви самі їх вставите, і розбираються у вашому браузері.',
        ],
      },
      {
        id: 'links',
        title: 'Зовнішні посилання',
        body: [
          'Посилання на GitHub і Ko-fi ведуть на сторонні сайти з власними політиками конфіденційності. Нічого з них не завантажується, поки ви самі не перейдете за посиланням.',
        ],
      },
      {
        id: 'rights',
        title: 'Ваші права',
        body: [
          'Відповідно до GDPR ви маєте право знати, які дані про вас є, виправити чи видалити їх, обмежити обробку або заперечити проти неї. Напишіть нам ({contact}), і ми відповімо протягом місяця.',
          'Ви також можете подати скаргу до наглядового органу у своїй країні; у Словаччині це [Úrad na ochranu osobných údajov SR](https://dataprotection.gov.sk/).',
        ],
      },
      {
        id: 'changes',
        title: 'Зміни',
        body: ['Якщо сайт почне обробляти дані інакше, ми оновимо цю сторінку та дату вгорі заздалегідь.'],
      },
    ],
  },
  en: {
    title: 'Privacy policy',
    lead: 'In short: we collect almost nothing. Your history lives in your browser. Only anonymous numbers for community stats (you can turn them off) and what you choose to share reach our server.',
    sections: [
      {
        id: 'who',
        title: 'Who is responsible',
        body: [
          'The site is run by a private individual, the project’s author (GitHub: SaigeNick). For any question about your data, contact {contact}.',
        ],
      },
      {
        id: 'browser',
        title: 'What is stored in your browser',
        body: [
          'The site stores in your browser’s localStorage:',
          [
            'your profiles and the pull history you imported or added by hand;',
            'settings: language, history view, planner values and your community stats choice;',
            'the private keys of your profile links, so you can update or delete them.',
          ],
          'The history itself does not leave your device unless you create a profile link. You can delete it on the [Profile](#/profile) page or by clearing site data in your browser settings. This storage is only used for features you ask for, so no separate consent is needed.',
        ],
      },
      {
        id: 'share',
        title: 'Profile links',
        body: [
          'If you press “Create link”, your profile name, region and pull history are sent to the server, and the link updates itself after each new import. Your game UID and private keys are not. The data is kept in Cloudflare storage until you delete the link, and anyone with the link can see it.',
          'Legal basis: your consent, given by creating the link. You can withdraw it at any time by deleting the link on the [Profile](#/profile) page or by contacting us.',
        ],
      },
      {
        id: 'drive',
        title: 'Google Drive',
        body: [
          'If you connect Google Drive, the site saves a copy of all your profiles and pulls, straight from your browser, to the app’s hidden folder on your Drive. It only needs the drive.appdata permission: the site can see its own file and nothing else in your Drive. The access token lives only in your browser tab, and the file never passes through our server, so we can’t see it.',
          'Google’s side is covered by the [Google privacy policy](https://policies.google.com/privacy). You can turn sync off or delete the copy on the [Profile](#/profile) page, and revoke the site’s access in your [Google account settings](https://myaccount.google.com/permissions).',
        ],
      },
      {
        id: 'stats',
        title: 'Community stats',
        body: [
          'To show how lucky you are compared with other players, the site sends only numbers from the limited banners to the server: your total rolls and the roll each S came on. They are stored with an identifier, a hash of your first pull’s internal number, so re-sending replaces your old numbers instead of duplicating them. No name, game UID or IP address is included.',
          'These numbers are kept in Cloudflare and deleted after 180 days without updates. They are only shown in aggregate (player count, averages). Legal basis: our legitimate interest in showing players community statistics.',
          'You can object at any time: turn off “Community stats” on the [Profile](#/profile#stats) page. Numbers already sent are then deleted and no new ones are sent.',
        ],
      },
      {
        id: 'abuse',
        title: 'Abuse protection',
        body: [
          'To stop anyone flooding the server, we count how many links and stats updates are sent from one IP address per hour. We store a SHA-256 hash of the address, not the address itself, and it is deleted automatically after about an hour. Legal basis: our legitimate interest in protecting the service.',
        ],
      },
      {
        id: 'hosting',
        title: 'Hosting',
        body: [
          'The site is hosted on Cloudflare Pages. Like any host, Cloudflare processes technical request data (IP address, browser type, time) to deliver pages and protect them from attacks. We do not receive visitor logs. See the [Cloudflare privacy policy](https://www.cloudflare.com/privacypolicy/).',
        ],
      },
      {
        id: 'none',
        title: 'What we don’t do',
        body: [
          [
            'no cookies, ads, analytics or trackers;',
            'no third-party scripts, fonts or images (the only exception is Google’s sign-in script, loaded only when you connect Google Drive yourself);',
            'we never ask for or store logins, passwords or payment details;',
            'we don’t sell or share your data.',
          ],
        ],
      },
      {
        id: 'sync',
        title: 'The sync command',
        body: [
          'The command runs only on your computer: it copies your pull history to your clipboard and sends it nowhere. Data reaches the site only when you paste it yourself, and it is decoded in your browser.',
        ],
      },
      {
        id: 'links',
        title: 'External links',
        body: [
          'Links to GitHub and Ko-fi lead to third-party sites with their own privacy policies. Nothing loads from them unless you follow the link.',
        ],
      },
      {
        id: 'rights',
        title: 'Your rights',
        body: [
          'Under the GDPR you have the right to know what data about you exists, to correct or delete it, and to restrict or object to its processing. Contact us ({contact}) and we will reply within a month.',
          'You can also complain to the data protection authority in your country; in Slovakia that is the [Úrad na ochranu osobných údajov SR](https://dataprotection.gov.sk/).',
        ],
      },
      {
        id: 'changes',
        title: 'Changes',
        body: ['If the site starts handling data differently, we will update this page and the date above in advance.'],
      },
    ],
  },
}

/* ---------------- Terms ---------------- */

const TERMS: Record<Lang, Doc> = {
  uk: {
    title: 'Умови використання',
    lead: 'Користуючись сайтом, ви погоджуєтеся з цими умовами. Вони короткі.',
    sections: [
      {
        id: 'unofficial',
        title: 'Неофіційний проєкт',
        body: [
          'Hethereau Ledger — неофіційний фан-сайт. Він не пов’язаний з Hotta Studio, Perfect World Games чи їхніми партнерами, не схвалений і не підтримується ними. Neverness to Everness, назви, зображення та інші матеріали гри є власністю їхніх правовласників і використовуються лише для того, щоб гравці впізнавали свої нагороди.',
        ],
      },
      {
        id: 'asis',
        title: 'Без гарантій',
        body: [
          'Сайт і команда синхронізації надаються «як є», безкоштовно і без жодних гарантій. Дані можуть бути неповними чи неточними, шанси взяті з неофіційних джерел, а гра може змінитися будь-коли.',
          'Ми не відповідаємо за рішення витрачати гроші чи ресурси в грі, за втрату даних у браузері, а також за будь-які дії розробника гри щодо вашого акаунта. Командою синхронізації ви користуєтеся на власний ризик; детальніше — у [питаннях та відповідях](#/faq).',
        ],
      },
      {
        id: 'rules',
        title: 'Правила',
        body: [
          [
            'не публікуйте через посилання на профіль чужі дані без згоди власника;',
            'не використовуйте образливі чи незаконні назви профілів;',
            'не намагайтеся перевантажити, зламати чи обійти захист сервера.',
          ],
          'Ми можемо видалити посилання, яке порушує ці правила, без попередження.',
        ],
      },
      {
        id: 'ip',
        title: 'Код і права',
        body: [
          'Код сайту відкритий під ліцензією [GNU AGPL-3.0](' + REPO_URL + '/blob/main/LICENSE). Ліцензія не поширюється на матеріали гри.',
          'Якщо ви правовласник і вважаєте, що щось на сайті порушує ваші права, напишіть нам ({contact}). Ми розглянемо звернення й оперативно приберемо спірний матеріал.',
        ],
      },
      {
        id: 'support',
        title: 'Підтримка проєкту',
        body: [
          'Пожертви через Ko-fi добровільні. Вони не є оплатою товару чи послуги й не дають жодних переваг на сайті.',
        ],
      },
      {
        id: 'changes',
        title: 'Зміни й завершення',
        body: [
          'Ми можемо змінювати сайт, ці умови або припинити роботу сайту. Про суттєві зміни умов повідомимо на цій сторінці. Ваша історія в браузері залишиться у вас, тож робіть резервні копії на сторінці [Профіль](#/profile).',
        ],
      },
    ],
  },
  en: {
    title: 'Terms of use',
    lead: 'By using the site you agree to these terms. They are short.',
    sections: [
      {
        id: 'unofficial',
        title: 'Unofficial project',
        body: [
          'Hethereau Ledger is an unofficial fan site. It is not affiliated with, endorsed or supported by Hotta Studio, Perfect World Games or their partners. Neverness to Everness, its names, images and other game materials are the property of their rights holders and are used only so players can recognise their rewards.',
        ],
      },
      {
        id: 'asis',
        title: 'No warranty',
        body: [
          'The site and the sync command are provided “as is”, free of charge and without any warranty. Data may be incomplete or inaccurate, rates come from unofficial sources, and the game can change at any time.',
          'We are not responsible for decisions to spend money or resources in the game, for data lost from your browser, or for any action the game’s developer takes on your account. You use the sync command at your own risk; see the [FAQ](#/faq).',
        ],
      },
      {
        id: 'rules',
        title: 'Rules',
        body: [
          [
            'don’t publish someone else’s data through a profile link without their consent;',
            'don’t use offensive or unlawful profile names;',
            'don’t try to overload, break into or bypass the server’s protections.',
          ],
          'We may delete a link that breaks these rules without notice.',
        ],
      },
      {
        id: 'ip',
        title: 'Code and rights',
        body: [
          'The site’s code is open under the [GNU AGPL-3.0](' + REPO_URL + '/blob/main/LICENSE) licence. The licence does not cover game materials.',
          'If you are a rights holder and believe something on the site infringes your rights, contact us ({contact}). We will review the request and promptly remove the material in question.',
        ],
      },
      {
        id: 'support',
        title: 'Supporting the project',
        body: [
          'Ko-fi donations are voluntary. They are not payment for goods or services and give no perks on the site.',
        ],
      },
      {
        id: 'changes',
        title: 'Changes and shutdown',
        body: [
          'We may change the site or these terms, or stop running the site. We will post significant changes to the terms on this page. Your browser history stays with you, so keep backups from the [Profile](#/profile) page.',
        ],
      },
    ],
  },
}

export const PrivacyPage = () => <DocPage doc={PRIVACY} />
export const TermsPage = () => <DocPage doc={TERMS} />
