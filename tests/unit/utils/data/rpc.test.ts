import { describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
import {
  EIP1967_IMPLEMENTATION_SLOT,
  PUBLIC_ETHEREUM_RPC_URL,
  createChainClient,
  probeAdmin,
  readImplementationSlot,
} from '~/utils/data/rpc'
import type { ChainClient } from '~/utils/data/rpc'

const TOKEN: Address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const OWNER: Address = '0x1111111111111111111111111111111111111111'
const WITH_OWNER = [{ type: 'function', name: 'owner' }]
const WITHOUT_OWNER = [
  { type: 'function', name: 'transfer' },
  { type: 'event', name: 'owner' },
]

function fakeClient(overrides: Partial<Record<keyof ChainClient, unknown>> = {}) {
  return {
    getStorageAt: vi.fn().mockResolvedValue('0x00'),
    getCode: vi.fn().mockResolvedValue('0x'),
    readContract: vi.fn().mockResolvedValue(OWNER),
    ...overrides,
  } as unknown as ChainClient
}

describe('createChainClient', () => {
  it('builds a client for the default and a custom endpoint', () => {
    expect(PUBLIC_ETHEREUM_RPC_URL).toMatch(/^https:/)
    expect(createChainClient()).toHaveProperty('readContract')
    expect(createChainClient('https://rpc.test')).toHaveProperty('getStorageAt')
  })
})

describe('readImplementationSlot', () => {
  it('reads the EIP-1967 slot', async () => {
    const client = fakeClient({ getStorageAt: vi.fn().mockResolvedValue('0xabc') })
    await expect(readImplementationSlot(client, TOKEN)).resolves.toBe('0xabc')
    expect(client.getStorageAt).toHaveBeenCalledWith({
      address: TOKEN,
      slot: EIP1967_IMPLEMENTATION_SLOT,
    })
  })

  it('treats an undefined slot as empty', async () => {
    const client = fakeClient({ getStorageAt: vi.fn().mockResolvedValue(undefined) })
    await expect(readImplementationSlot(client, TOKEN)).resolves.toBe('0x')
  })

  it('returns null when the node fails', async () => {
    const client = fakeClient({
      getStorageAt: vi.fn().mockRejectedValue(new Error('down')),
    })
    await expect(readImplementationSlot(client, TOKEN)).resolves.toBeNull()
  })
})

describe('probeAdmin', () => {
  it('reports none without calling the chain when the ABI has no owner()', async () => {
    const client = fakeClient()
    await expect(probeAdmin(client, TOKEN, WITHOUT_OWNER)).resolves.toEqual({
      kind: 'none',
    })
    expect(client.readContract).not.toHaveBeenCalled()
  })

  it('reports unknown when owner() cannot be read', async () => {
    const client = fakeClient({
      readContract: vi.fn().mockRejectedValue(new Error('revert')),
    })
    await expect(probeAdmin(client, TOKEN, WITH_OWNER)).resolves.toEqual({
      kind: 'unknown',
    })
  })

  it('still asks the chain when the ABI is unavailable', async () => {
    const client = fakeClient()
    const probe = await probeAdmin(client, TOKEN, null)
    expect(probe).toEqual({
      kind: 'found',
      address: OWNER,
      isContract: false,
      multisig: null,
    })
  })

  it('identifies a regular wallet owner', async () => {
    const client = fakeClient({ getCode: vi.fn().mockResolvedValue(undefined) })
    const probe = await probeAdmin(client, TOKEN, WITH_OWNER)
    expect(probe).toMatchObject({ isContract: false, multisig: null })
    expect(client.readContract).toHaveBeenCalledTimes(1)
  })

  it('identifies a Safe-style multisig owner', async () => {
    const readContract = vi.fn(async ({ functionName }: { functionName: string }) => {
      if (functionName === 'owner') return OWNER
      if (functionName === 'getThreshold') return 3n
      return [OWNER, TOKEN, OWNER, TOKEN, OWNER]
    })
    const client = fakeClient({
      readContract,
      getCode: vi.fn().mockResolvedValue('0x6080'),
    })
    const probe = await probeAdmin(client, TOKEN, WITH_OWNER)
    expect(probe).toEqual({
      kind: 'found',
      address: OWNER,
      isContract: true,
      multisig: { threshold: 3, signers: 5 },
    })
  })

  it('treats a contract owner without Safe functions as a plain contract', async () => {
    const readContract = vi.fn(async ({ functionName }: { functionName: string }) => {
      if (functionName === 'owner') return OWNER
      throw new Error('no such function')
    })
    const client = fakeClient({
      readContract,
      getCode: vi.fn().mockResolvedValue('0x6080'),
    })
    const probe = await probeAdmin(client, TOKEN, WITH_OWNER)
    expect(probe).toMatchObject({ isContract: true, multisig: null })
  })

  it('leaves isContract unknown when the code lookup fails', async () => {
    const client = fakeClient({ getCode: vi.fn().mockRejectedValue(new Error('down')) })
    const probe = await probeAdmin(client, TOKEN, WITH_OWNER)
    expect(probe).toMatchObject({ kind: 'found', isContract: null, multisig: null })
  })
})
