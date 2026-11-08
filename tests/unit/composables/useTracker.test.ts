import { afterEach, describe, expect, it, vi } from 'vitest'
import { setAnalyticsSink, useTracker } from '~/composables/useTracker'
import { createMemorySink } from '~/utils/analytics'

afterEach(() => setAnalyticsSink())

describe('useTracker', () => {
  it('returns one shared tracker', () => {
    expect(useTracker()).toBe(useTracker())
  })

  it('logs to the console by default', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    useTracker().track('address_submitted', { source: 'typed' })
    expect(spy).toHaveBeenCalledWith('[track]', 'address_submitted', { source: 'typed' })
    spy.mockRestore()
  })

  it('re-routes events when the sink is swapped', () => {
    const sink = createMemorySink()
    setAnalyticsSink(sink)
    useTracker().track('explain_opened', { check: 'mint' })
    expect(sink.events).toEqual([{ event: 'explain_opened', props: { check: 'mint' } }])
  })
})
