import { describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
import { PLAIN_TOKEN_ABI, POWERFUL_TOKEN_ABI } from '@fixtures/abis'
import type { ContractInfo, Holder, TokenInfo } from '~/types/analysis'
import {
  analyzeConcentration,
  analyzeCore,
  completeAnalysis,
} from '~/utils/analysis/analyze'
import type { AnalysisDeps } from '~/utils/analysis/analyze'
import { mergeAbis } from '~/utils/analysis/merge-abi'
import { DataError } from '~/utils/data/http'

const TOKEN: Address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const IMPL: Address = '0x43506849D7C04F9138D1A2050bbF3A0c054402dd'
const OWNER: Address = '0x1111111111111111111111111111111111111111'
const NOW = new Date('2026-11-08T10:00:00.000Z')

const tokenInfo: TokenInfo = {
  name: 'Test',
  symbol: 'TST',
  decimals: 6,
  totalSupply: 1000n,
  holdersCount: 42,
}

const contract = (overrides: Partial<ContractInfo> = {}): ContractInfo => ({
  isVerified: true,
  isProxy: false,
  abi: PLAIN_TOKEN_ABI,
  implementations: [],
  ...overrides,
})

const holders: Holder[] = [{ address: OWNER, value: 500n }]

function deps(
  explorer: Partial<Record<'getToken' | 'getContract' | 'getHolders', unknown>> = {},
  chain: Record<string, unknown> = {},
): AnalysisDeps {
  return {
    now: () => NOW,
    explorer: {
      getToken: vi.fn().mockResolvedValue(tokenInfo),
      getContract: vi.fn().mockResolvedValue(contract()),
      getHolders: vi.fn().mockResolvedValue(holders),
      ...explorer,
    } as unknown as AnalysisDeps['explorer'],
    chain: {
      getStorageAt: vi.fn().mockResolvedValue(`0x${'0'.repeat(64)}`),
      getCode: vi.fn().mockResolvedValue('0x'),
      readContract: vi.fn().mockResolvedValue(OWNER),
      ...chain,
    } as unknown as AnalysisDeps['chain'],
  }
}

const statuses = (results: { id: string; status: string }[]) =>
  Object.fromEntries(results.map((result) => [result.id, result.status]))

describe('mergeAbis', () => {
  it('concatenates present ABIs and skips missing ones', () => {
    expect(mergeAbis(PLAIN_TOKEN_ABI, null, undefined, POWERFUL_TOKEN_ABI)).toHaveLength(
      PLAIN_TOKEN_ABI.length + POWERFUL_TOKEN_ABI.length,
    )
  })

  it('returns null when nothing is available', () => {
    expect(mergeAbis(null, undefined)).toBeNull()
    expect(mergeAbis()).toBeNull()
  })
})

describe('analyzeCore', () => {
  it('analyses a plain, non-proxy token', async () => {
    const core = await analyzeCore(TOKEN, deps())

    expect(core.address).toBe(TOKEN)
    expect(core.source).toBe('live')
    expect(core.fetchedAt).toBe(NOW.toISOString())
    expect(core.token).toEqual({ ...tokenInfo, totalSupply: '1000' })
    expect(core.results.map((r) => r.id)).toEqual([
      'verified',
      'upgradeable',
      'pause',
      'freeze',
      'mint',
      'admin',
    ])
    expect(statuses(core.results)).toEqual({
      verified: 'yes',
      upgradeable: 'no',
      pause: 'no',
      freeze: 'no',
      mint: 'no',
      admin: 'no',
    })
  })

  it('defaults the clock to the current time', async () => {
    const { now: _now, ...withoutClock } = deps()
    const core = await analyzeCore(TOKEN, withoutClock)
    expect(Number.isNaN(Date.parse(core.fetchedAt))).toBe(false)
  })

  it('reads powers from the implementation ABI of a proxy', async () => {
    const getContract = vi.fn(async (address: Address) =>
      address === TOKEN
        ? contract({
            isProxy: true,
            implementations: [IMPL],
            abi: [{ type: 'function', name: 'upgradeTo' }],
          })
        : contract({ abi: POWERFUL_TOKEN_ABI }),
    )
    const core = await analyzeCore(TOKEN, deps({ getContract }))

    expect(getContract).toHaveBeenCalledWith(IMPL)
    expect(statuses(core.results)).toMatchObject({
      verified: 'yes',
      upgradeable: 'yes',
      pause: 'yes',
      freeze: 'yes',
      mint: 'yes',
      admin: 'yes',
    })
  })

  it('does not guess powers when a proxy implementation cannot be read', async () => {
    const getContract = vi.fn(async (address: Address) => {
      if (address === TOKEN) return contract({ isProxy: true, implementations: [IMPL] })
      throw new DataError('timeout', 'slow')
    })
    const core = await analyzeCore(TOKEN, deps({ getContract }))

    expect(statuses(core.results)).toMatchObject({
      verified: 'unknown',
      upgradeable: 'yes',
      pause: 'unknown',
      freeze: 'unknown',
      mint: 'unknown',
    })
  })

  it('requires both proxy and implementation to be verified', async () => {
    const getContract = vi.fn(async (address: Address) =>
      address === TOKEN
        ? contract({ isProxy: true, implementations: [IMPL] })
        : contract({ isVerified: false }),
    )
    const core = await analyzeCore(TOKEN, deps({ getContract }))
    expect(statuses(core.results).verified).toBe('no')
  })

  it('leaves ABI-based checks unknown when the contract lookup fails', async () => {
    const getContract = vi.fn().mockRejectedValue(new DataError('http', 'down', 500))
    const core = await analyzeCore(TOKEN, deps({ getContract }))
    expect(statuses(core.results)).toMatchObject({
      verified: 'unknown',
      upgradeable: 'no',
      pause: 'unknown',
      admin: 'yes',
    })
  })

  it('still answers when only the contract lookup works', async () => {
    const getToken = vi.fn().mockRejectedValue(new DataError('http', 'down', 500))
    const core = await analyzeCore(TOKEN, deps({ getToken }))
    expect(core.token).toEqual({
      name: null,
      symbol: null,
      decimals: null,
      totalSupply: null,
      holdersCount: null,
    })
    expect(statuses(core.results).verified).toBe('yes')
  })

  it('uses the chain slot when the explorer has no contract record', async () => {
    const getContract = vi.fn().mockResolvedValue(null)
    const getStorageAt = vi
      .fn()
      .mockResolvedValue(`0x${'0'.repeat(24)}${'ab'.repeat(20)}`)
    const core = await analyzeCore(TOKEN, deps({ getContract }, { getStorageAt }))
    expect(statuses(core.results)).toMatchObject({
      verified: 'unknown',
      upgradeable: 'yes',
    })
  })

  it('rejects addresses the explorer does not know as tokens', async () => {
    const getToken = vi.fn().mockResolvedValue(null)
    await expect(analyzeCore(TOKEN, deps({ getToken }))).rejects.toMatchObject({
      name: 'AnalysisError',
      kind: 'not-a-token',
      message: 'Address is not a known token',
    })
  })

  it('reports unreachable data sources', async () => {
    const down = vi.fn().mockRejectedValue(new DataError('network', 'offline'))
    await expect(
      analyzeCore(TOKEN, deps({ getToken: down, getContract: down })),
    ).rejects.toMatchObject({
      kind: 'unreachable',
      message: 'Data sources are unreachable',
    })
  })
})

describe('analyzeConcentration', () => {
  it('measures concentration from holders and total supply', async () => {
    const result = await analyzeConcentration(TOKEN, '1000', deps())
    expect(result).toMatchObject({ status: 'yes', top1: 50, top10: 50, level: 'medium' })
  })

  it('is unknown without a total supply and skips the request', async () => {
    const setup = deps()
    const result = await analyzeConcentration(TOKEN, null, setup)
    expect(result.status).toBe('unknown')
    expect(setup.explorer.getHolders).not.toHaveBeenCalled()
  })

  it('is unknown when the holder list cannot be read', async () => {
    const getHolders = vi.fn().mockRejectedValue(new DataError('timeout', 'slow'))
    const result = await analyzeConcentration(TOKEN, '1000', deps({ getHolders }))
    expect(result.status).toBe('unknown')
  })
})

describe('completeAnalysis', () => {
  it('appends concentration and summarises confidence', async () => {
    const setup = deps()
    const core = await analyzeCore(TOKEN, setup)
    const concentration = await analyzeConcentration(TOKEN, core.token.totalSupply, setup)
    const analysis = completeAnalysis(core, concentration)

    expect(analysis.results).toHaveLength(7)
    expect(analysis.results.at(-1)).toBe(concentration)
    expect(analysis.confidence).toEqual({ completed: 7, total: 7 })
    expect(core.results).toHaveLength(6)
  })
})
