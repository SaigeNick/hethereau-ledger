// Runs before the site, the API and the sync script (see public/_routes.json).
// Visitors from Russia and Belarus get a short notice instead of the site. Cloudflare
// tells the country from the IP address, so a VPN gets around it.
const BLOCKED = new Set(['RU', 'BY'])

const PAGE = `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hethereau Ledger</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #12162b; color: #e9ebff; font: 17px/1.5 system-ui, sans-serif; }
  main { max-width: 420px; padding: 24px; text-align: center; }
  p { margin: 0 0 10px; }
  .en { color: #969dc6; }
</style>
</head>
<body>
<main>
  <p>Сайт недоступний у Росії та Білорусі.</p>
  <p class="en" lang="en">This site is not available in Russia and Belarus.</p>
</main>
</body>
</html>`

export const onRequest: PagesFunction = async ({ request, next }) => {
  const country = (request as Request & { cf?: { country?: string } }).cf?.country
  if (country && BLOCKED.has(country)) {
    return new Response(PAGE, {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }
  return next()
}
