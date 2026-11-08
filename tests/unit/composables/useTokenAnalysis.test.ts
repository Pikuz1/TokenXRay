import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
import { PLAIN_TOKEN_ABI } from '@fixtures/abis'
import { setAnalyticsSink } from '~/composables/useTracker'
import { useTokenAnalysis } from '~/composables/useTokenAnalysis'
import { ANALYSIS_ERROR_MESSAGES } from '~/content/messages'
import { ADDRESS_ERROR_MESSAGES } from '~/utils/address'
import type { AnalysisDeps } from '~/utils/analysis/analyze'
import { SAMPLE_TOKENS } from '~/utils/analysis/samples'
import { createMemorySink } from '~/utils/analytics'
import { DataError } from '~/utils/data/http'

const TOKEN: Address = '0x2222222222222222222222222222222222222222'
const OWNER: Address = '0x1111111111111111111111111111111111111111'
const SAMPLE = SAMPLE_TOKENS[0]!

function deps(
  explorer: Record<string, unknown> = {},
  chain: Record<string, unknown> = {},
): AnalysisDeps {
  return {
    explorer: {
      getToken: vi.fn().mockResolvedValue({
        name: 'Test',
        symbol: 'TST',
        decimals: 6,
        totalSupply: 1000n,
        holdersCount: 3,
      }),
      getContract: vi.fn().mockResolvedValue({
        isVerified: true,
        isProxy: false,
        abi: PLAIN_TOKEN_ABI,
        implementations: [],
      }),
      getHolders: vi.fn().mockResolvedValue([{ address: OWNER, value: 500n }]),
      ...explorer,
    },
    chain: {
      getStorageAt: vi.fn().mockResolvedValue('0x'),
      getCode: vi.fn().mockResolvedValue('0x'),
      readContract: vi.fn().mockResolvedValue(OWNER),
      ...chain,
    },
  } as unknown as AnalysisDeps
}

const down = () => vi.fn().mockRejectedValue(new DataError('network', 'offline'))

afterEach(() => setAnalyticsSink())

describe('useTokenAnalysis', () => {
  it('starts idle', () => {
    const state = useTokenAnalysis(deps())
    expect(state.status.value).toBe('idle')
    expect(state.results.value).toEqual([])
    expect(state.analysis.value).toBeNull()
    expect(state.pendingConcentration.value).toBe(false)
  })

  it('shows fast checks first and concentration afterwards', async () => {
    let release!: (holders: { address: Address; value: bigint }[]) => void
    const getHolders = vi.fn(() => new Promise((resolve) => (release = resolve)))
    const state = useTokenAnalysis(deps({ getHolders }))

    const run = state.analyze(TOKEN)
    expect(state.status.value).toBe('loading')
    await flushPromises()

    expect(state.status.value).toBe('ready')
    expect(state.results.value).toHaveLength(6)
    expect(state.pendingConcentration.value).toBe(true)
    expect(state.analysis.value).toBeNull()

    release([{ address: OWNER, value: 500n }])
    await run

    expect(state.results.value).toHaveLength(7)
    expect(state.pendingConcentration.value).toBe(false)
    expect(state.analysis.value?.confidence).toEqual({ completed: 7, total: 7 })
    expect(state.core.value?.source).toBe('live')
  })

  it('reports an invalid address without touching the network', async () => {
    const setup = deps()
    const state = useTokenAnalysis(setup)
    await state.analyze('nope')

    expect(state.status.value).toBe('error')
    expect(state.error.value).toBe(ADDRESS_ERROR_MESSAGES.format)
    expect(setup.explorer.getToken).not.toHaveBeenCalled()
  })

  it('clears earlier results when a later address is invalid', async () => {
    const state = useTokenAnalysis(deps())
    await state.analyze(TOKEN)
    await state.analyze('')

    expect(state.core.value).toBeNull()
    expect(state.results.value).toEqual([])
    expect(state.error.value).toBe(ADDRESS_ERROR_MESSAGES.empty)
  })

  it('explains when the address is not a token', async () => {
    const state = useTokenAnalysis(deps({ getToken: vi.fn().mockResolvedValue(null) }))
    await state.analyze(TOKEN)
    expect(state.status.value).toBe('error')
    expect(state.error.value).toBe(ANALYSIS_ERROR_MESSAGES['not-a-token'])
  })

  it('does not substitute sample data for a missing token, even a known sample', async () => {
    const state = useTokenAnalysis(deps({ getToken: vi.fn().mockResolvedValue(null) }))
    await state.analyze(SAMPLE.address)
    expect(state.status.value).toBe('error')
  })

  it('falls back to the saved sample when sources are unreachable', async () => {
    const state = useTokenAnalysis(deps({ getToken: down(), getContract: down() }))
    await state.analyze(SAMPLE.address.toLowerCase())

    expect(state.status.value).toBe('ready')
    expect(state.error.value).toBeNull()
    expect(state.core.value?.source).toBe('sample')
    expect(state.analysis.value?.results).toHaveLength(7)
    expect(state.pendingConcentration.value).toBe(false)
  })

  it('shows an error when sources are unreachable and no sample exists', async () => {
    const state = useTokenAnalysis(deps({ getToken: down(), getContract: down() }))
    await state.analyze(TOKEN)
    expect(state.status.value).toBe('error')
    expect(state.error.value).toBe(ANALYSIS_ERROR_MESSAGES.unreachable)
  })

  it('treats unexpected failures like unreachable sources', async () => {
    const getToken = vi.fn(() => {
      throw new Error('boom')
    })
    const state = useTokenAnalysis(deps({ getToken }))
    await state.analyze(TOKEN)
    expect(state.error.value).toBe(ANALYSIS_ERROR_MESSAGES.unreachable)
  })

  it('ignores a superseded request that finishes late', async () => {
    let finishFirst!: (value: unknown) => void
    const getToken = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
      .mockResolvedValue({
        name: 'Second',
        symbol: 'TWO',
        decimals: 6,
        totalSupply: 1000n,
        holdersCount: 1,
      })
    const state = useTokenAnalysis(deps({ getToken }))

    const first = state.analyze(TOKEN)
    await state.analyze(OWNER)
    finishFirst({
      name: 'First',
      symbol: 'ONE',
      decimals: 6,
      totalSupply: 1n,
      holdersCount: 1,
    })
    await first

    expect(state.core.value?.token.name).toBe('Second')
    expect(state.core.value?.address).toBe(OWNER)
  })

  it('ignores a superseded request that fails late', async () => {
    const failures: ((reason: unknown) => void)[] = []
    const hang = () => new Promise((_resolve, reject) => failures.push(reject))
    const getToken = vi.fn().mockImplementationOnce(hang).mockResolvedValue({
      name: 'Second',
      symbol: 'TWO',
      decimals: 6,
      totalSupply: 1000n,
      holdersCount: 1,
    })
    const getContract = vi.fn().mockImplementationOnce(hang).mockResolvedValue({
      isVerified: true,
      isProxy: false,
      abi: PLAIN_TOKEN_ABI,
      implementations: [],
    })
    const state = useTokenAnalysis(deps({ getToken, getContract }))

    const first = state.analyze(TOKEN)
    await state.analyze(OWNER)
    failures.forEach((fail) => fail(new DataError('network', 'offline')))
    await first

    expect(state.status.value).toBe('ready')
    expect(state.error.value).toBeNull()
  })

  it('ignores holder data that arrives for a superseded request', async () => {
    const releases: ((holders: unknown[]) => void)[] = []
    const getHolders = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => releases.push(resolve)))
      .mockImplementation(() => new Promise((resolve) => releases.push(resolve)))
    const state = useTokenAnalysis(deps({ getHolders }))

    const first = state.analyze(TOKEN)
    await flushPromises()
    const second = state.analyze(OWNER)
    await flushPromises()

    releases[0]!([{ address: OWNER, value: 1000n }])
    await first
    expect(state.pendingConcentration.value).toBe(true)

    releases[1]!([{ address: OWNER, value: 10n }])
    await second
    expect(state.pendingConcentration.value).toBe(false)
  })

  it('records the submission with its origin and validity', async () => {
    const sink = createMemorySink()
    setAnalyticsSink(sink)
    const state = useTokenAnalysis(deps())

    await state.analyze('bad')
    await state.analyze(TOKEN, 'sample')

    expect(sink.events).toEqual([
      { event: 'address_submitted', props: { origin: 'typed', valid: false } },
      { event: 'address_submitted', props: { origin: 'sample', valid: true } },
    ])
  })

  it('builds public data sources when none are injected', async () => {
    const created = deps()
    vi.resetModules()
    vi.doMock('~/utils/analysis/defaults', () => ({ createDefaultDeps: () => created }))
    const { useTokenAnalysis: fresh } = await import('~/composables/useTokenAnalysis')

    const state = fresh()
    await state.analyze(TOKEN)
    expect(state.status.value).toBe('ready')
    expect(created.explorer.getToken).toHaveBeenCalled()

    vi.doUnmock('~/utils/analysis/defaults')
  })
})
