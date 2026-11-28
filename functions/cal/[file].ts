// GET /cal/uk.ics or /cal/en.ics — banner calendar to subscribe to.
import { buildIcs } from '../../src/lib/calendar'

export const onRequestGet: PagesFunction = async ({ params }) => {
  const file = String(params.file ?? '')
  const lang = file === 'uk.ics' ? 'uk' : file === 'en.ics' ? 'en' : null
  if (!lang) return new Response('Not found', { status: 404 })
  return new Response(buildIcs(lang), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="nte-banners-${lang}.ics"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
