import { describe, expect, it } from 'vitest'
import { onRequest } from '../../functions/_middleware'

const call = (country?: string) =>
  (onRequest as unknown as (c: unknown) => Promise<Response>)({
    request: Object.assign(new Request('https://x.dev/'), { cf: country ? { country } : undefined }),
    next: async () => new Response('site'),
  })

describe('country block', () => {
  it('shows a notice to Russia and Belarus', async () => {
    for (const c of ['RU', 'BY']) {
      const res = await call(c)
      expect(res.status).toBe(403)
      expect(await res.text()).toContain('недоступний у Росії та Білорусі')
    }
  })
  it('lets everyone else through', async () => {
    for (const c of ['UA', 'SK', 'US', undefined]) expect(await (await call(c)).text()).toBe('site')
  })
})
