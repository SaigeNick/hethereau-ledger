# Hethereau Ledger

Трекер круток для **Neverness to Everness**: гарант (pity) на всіх банерах, ваші S, статистика удачі, посилання на профіль.
Фан-проєкт, не пов'язаний з Hotta Studio чи Perfect World Games. Назви та зображення з гри належать їхнім власникам.

## Що вміє

- Імпорт JSON з [NTE History Exporter](https://github.com/Golumpa/nte-exporter) для чотирьох пулів: лімітована дошка, стандартна дошка, Arc Miracle Box, Mystery Box. Повторний імпорт не задвоює крутки.
- Ручне додавання круток, якщо експортера немає під рукою.
- Дошка гаранту у вигляді ігрового поля, середній гарант, удача порівняно з офіційним шансом, гістограма.
- Кілька профілів на одному пристрої (окремий профіль на кожен ігровий UID).
- Посилання на профіль (`/#/u/<id>`) через Cloudflare Pages Functions + KV. Ігровий UID у посилання не потрапляє.
- Українська та англійська.

## Правила гачі, які закладені

Файл `src/lib/banners.ts`. Дошки персонажів: гарант на 90-му кидку, після 70 кидків поле змінюється. Arc: S гарантовано за 60 круток.
Якщо гра змінить правила, міняти треба тут.

## Розробка

```bash
npm install
npm run dev       # сайт на localhost:5173 (без сервера посилань)
npm test          # тести логіки
npm run build
npx wrangler pages dev dist   # сайт разом з API посилань локально
```

## Картинки персонажів

Покладіть файли `<reward_id>.webp` (або .png/.jpg) у `src/assets/portraits/`. Наприклад `1052.webp` для Hotori.
`reward_id` видно в JSON експортера. Без файлу показується монограма.

## Ko-fi

Вставте посилання в `src/config.ts` (`KOFI_URL`).

## Деплой на Cloudflare Pages

1. Створіть безкоштовний акаунт Cloudflare.
2. `npx wrangler login`
3. `npx wrangler kv namespace create SHARES` і вставте `id` у `wrangler.toml`.
4. У Cloudflare: Workers & Pages → Create → Pages → підключіть цей GitHub-репозиторій.
   Build command: `npm run build`, output: `dist`.
5. У налаштуваннях проєкту Pages → Bindings додайте KV namespace `SHARES`.

## Імпорт однією командою

`public/sync.ps1` лише ловить пакети історії круток з мережевого трафіку гри і копіює їх у буфер обміну.
Розшифровує їх сайт (`src/lib/nteDecoder.ts`), тому команду не треба оновлювати, коли виходять нові персонажі чи банери.
Скрипт нічого не надсилає в інтернет і не чіпає гру, її файли чи пам'ять.

## Ліцензія

Copyright (C) 2026 SaigeNick

Код поширюється за ліцензією GNU AGPL-3.0 (див. `LICENSE`). Ігрові назви, дані та зображення
належать Hotta Studio та Perfect World і під цю ліцензію не підпадають.
