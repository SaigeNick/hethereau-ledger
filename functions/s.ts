// GET /s?k=<stop markers> — the sync script, with the newest saved pull of
// each banner put in front so the script can say when to stop scrolling.
import { decodeTargets } from '../src/lib/syncHint'

interface Env {
  ASSETS: Fetcher
}

const NAMES: Record<string, string> = {
  Lottery_LimitedCharacter: 'Limited Board',
  Lottery_Permanent: 'Standard Board',
  Arc_MiracleBox: 'Arc Miracle Box',
  Gashapon_MysteryBox: 'Mystery Box',
}
const EPOCH_TICKS = 621_355_968_000_000_000n

function when(ticks: bigint) {
  const d = new Date(Number((ticks - EPOCH_TICKS) / 10_000n))
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const script = await env.ASSETS.fetch(new URL('/sync.ps1', request.url))
  let body = await script.text()
  const key = new URL(request.url).searchParams.get('k') ?? ''
  const targets = key.length <= 200 ? decodeTargets(key) : []
  if (targets.length) {
    // Only digits and fixed names reach the script; nothing from the URL is pasted in as text.
    const rows = targets.map((t) => `    @{ Name = '${NAMES[t.pool]}'; Lo = [long]'${t.lo}'; Hi = [long]'${t.hi}'; When = '${when(t.lo)}' }`)
    body = `$HlSince = @(\n${rows.join(",\n")}\n)\n` + body
  }
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
