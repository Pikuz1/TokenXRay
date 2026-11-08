import { describe, expect, it, vi } from 'vitest'
import {
  TRACK_EVENTS,
  createConsoleSink,
  createMemorySink,
  createTracker,
} from '~/utils/analytics'

describe('createTracker', () => {
  it('forwards events and props to the sink', () => {
    const sink = createMemorySink()
    const tracker = createTracker(sink)

    tracker.track('sample_token_clicked', { symbol: 'USDC' })
    tracker.track('report_printed')

    expect(sink.events).toEqual([
      { event: 'sample_token_clicked', props: { symbol: 'USDC' } },
      { event: 'report_printed', props: {} },
    ])
  })

  it('never throws when the sink fails', () => {
    const tracker = createTracker({
      record: () => {
        throw new Error('provider down')
      },
    })
    expect(() => tracker.track('explain_opened')).not.toThrow()
  })

  it('declares the supported events', () => {
    expect(TRACK_EVENTS).toContain('address_submitted')
  })
})

describe('createConsoleSink', () => {
  it('logs through the provided function', () => {
    const log = vi.fn()
    createConsoleSink(log).record('explain_opened', { check: 'pause' })
    expect(log).toHaveBeenCalledWith('[track]', 'explain_opened', { check: 'pause' })
  })

  it('defaults to console.debug', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    createConsoleSink().record('report_printed', {})
    expect(spy).toHaveBeenCalledWith('[track]', 'report_printed', {})
    spy.mockRestore()
  })
})
