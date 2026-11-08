import { describe, expect, it, vi } from 'vitest'
import { DataError, fetchJson } from '~/utils/data/http'

const respond = (body: unknown, init?: ResponseInit) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), init))

describe('fetchJson', () => {
  it('returns parsed JSON and sends an accept header and a timeout signal', async () => {
    const fetcher = respond({ ok: true })
    await expect(fetchJson('https://x.test/a', { fetcher })).resolves.toEqual({
      ok: true,
    })

    const [url, init] = fetcher.mock.calls[0]!
    expect(url).toBe('https://x.test/a')
    expect(init.headers).toEqual({ accept: 'application/json' })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('uses the global fetch by default', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"a":1}'))
    await expect(fetchJson('https://x.test/b')).resolves.toEqual({ a: 1 })
    spy.mockRestore()
  })

  it('maps a timeout to a timeout error', async () => {
    const fetcher = vi.fn().mockRejectedValue(new DOMException('slow', 'TimeoutError'))
    await expect(fetchJson('https://x.test', { fetcher })).rejects.toMatchObject({
      name: 'DataError',
      kind: 'timeout',
    })
  })

  it('maps other failures to a network error', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(fetchJson('https://x.test', { fetcher })).rejects.toMatchObject({
      kind: 'network',
    })
  })

  it('maps non-2xx responses to an http error with the status', async () => {
    const fetcher = respond({}, { status: 429 })
    const error = await fetchJson('https://x.test', { fetcher }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(DataError)
    expect(error).toMatchObject({ kind: 'http', status: 429 })
  })

  it('maps invalid JSON to a parse error', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('<html>'))
    await expect(fetchJson('https://x.test', { fetcher })).rejects.toMatchObject({
      kind: 'parse',
    })
  })
})
