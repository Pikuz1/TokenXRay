import { describe, expect, it, vi } from 'vitest'
import {
  BLOCKSCOUT_ETHEREUM_URL,
  createBlockscoutClient,
  parseContract,
  parseHolders,
  parseToken,
} from '~/utils/data/blockscout'

const TOKEN = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const IMPL = '0x43506849D7C04F9138D1A2050bbF3A0c054402dd'
const HOLDER = '0x37305B1cD40574E4C5Ce33f8e8306Be057fD7341'

describe('parseContract', () => {
  it('reads verification, proxy status, ABI and implementations', () => {
    const info = parseContract({
      is_verified: true,
      abi: [{ type: 'function', name: 'pause' }, { name: 'bad' }, 'junk'],
      implementations: [
        { address_hash: IMPL, name: 'Impl' },
        { address_hash: 'nope' },
        null,
      ],
    })
    expect(info).toEqual({
      isVerified: true,
      isProxy: true,
      abi: [{ type: 'function', name: 'pause' }],
      implementations: [IMPL],
    })
  })

  it('treats a missing or malformed payload as unverified with no ABI', () => {
    const empty = { isVerified: false, isProxy: false, abi: null, implementations: [] }
    expect(parseContract(null)).toEqual(empty)
    expect(parseContract({ implementations: 'x', is_verified: 'yes' })).toEqual(empty)
  })
})

describe('parseToken', () => {
  it('reads token metadata', () => {
    expect(
      parseToken({
        name: 'USDC',
        symbol: 'USDC',
        decimals: '6',
        total_supply: '46166509902498812',
        holders_count: '9576782',
      }),
    ).toEqual({
      name: 'USDC',
      symbol: 'USDC',
      decimals: 6,
      totalSupply: 46166509902498812n,
      holdersCount: 9576782,
    })
  })

  it('falls back to nulls', () => {
    expect(parseToken(undefined)).toEqual({
      name: null,
      symbol: null,
      decimals: null,
      totalSupply: null,
      holdersCount: null,
    })
  })
})

describe('parseHolders', () => {
  it('keeps valid holders and drops malformed entries', () => {
    const holders = parseHolders({
      items: [
        { address: { hash: HOLDER }, value: '500' },
        { address: { hash: 'bad' }, value: '5' },
        { address: { hash: HOLDER }, value: 'x' },
        { address: 'flat', value: '5' },
        'junk',
      ],
    })
    expect(holders).toEqual([{ address: HOLDER, value: 500n }])
  })

  it('returns an empty list for unexpected payloads', () => {
    expect(parseHolders(null)).toEqual([])
    expect(parseHolders({ items: 'x' })).toEqual([])
  })
})

describe('createBlockscoutClient', () => {
  const reply = (body: unknown, status = 200) =>
    vi.fn().mockImplementation(async () => new Response(JSON.stringify(body), { status }))

  it('requests the expected endpoints on the default host', async () => {
    const fetcher = reply({})
    const client = createBlockscoutClient(undefined, { fetcher })

    await client.getContract(TOKEN)
    await client.getToken(TOKEN)
    await client.getHolders(TOKEN)

    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      `${BLOCKSCOUT_ETHEREUM_URL}/api/v2/smart-contracts/${TOKEN}`,
      `${BLOCKSCOUT_ETHEREUM_URL}/api/v2/tokens/${TOKEN}`,
      `${BLOCKSCOUT_ETHEREUM_URL}/api/v2/tokens/${TOKEN}/holders`,
    ])
  })

  it('parses responses into domain types', async () => {
    const client = createBlockscoutClient('https://b.test', {
      fetcher: reply({ is_verified: true, name: 'T', items: [] }),
    })
    expect((await client.getContract(TOKEN))?.isVerified).toBe(true)
    expect((await client.getToken(TOKEN))?.name).toBe('T')
    expect(await client.getHolders(TOKEN)).toEqual([])
  })

  it('returns null or an empty list for unknown addresses', async () => {
    const client = createBlockscoutClient('https://b.test', { fetcher: reply({}, 404) })
    expect(await client.getContract(TOKEN)).toBeNull()
    expect(await client.getToken(TOKEN)).toBeNull()
    expect(await client.getHolders(TOKEN)).toEqual([])
  })

  it('rethrows other failures', async () => {
    const client = createBlockscoutClient('https://b.test', { fetcher: reply({}, 500) })
    await expect(client.getToken(TOKEN)).rejects.toMatchObject({
      kind: 'http',
      status: 500,
    })
  })

  it('rethrows non-http failures', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('offline'))
    const client = createBlockscoutClient('https://b.test', { fetcher })
    await expect(client.getToken(TOKEN)).rejects.toMatchObject({ kind: 'network' })
  })
})
