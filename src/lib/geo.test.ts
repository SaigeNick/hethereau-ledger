import { describe, expect, it } from 'vitest'
import { onRequest } from '../../functions/_middleware'

const call = (country?: string) =>
  (onRequest as unknown as (c: unknown) => Promise<Response>)({
    request: Object.assign(new Request('https://x.dev/'), { cf: country ? { country } : undefined }),
    next: async () => new Response('site'),
  })

describe('country block', () => {
  it('shows a notice to Russia', async () => {
    const res = await call('RU')
    expect(res.status).toBe(403)
    expect(await res.text()).toContain('недоступний у Росії')
  })
  it('lets everyone else through', async () => {
    for (const c of ['UA', 'SK', 'US', undefined]) expect(await (await call(c)).text()).toBe('site')
  })
})
