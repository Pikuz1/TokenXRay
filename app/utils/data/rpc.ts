import { createPublicClient, http, parseAbi } from 'viem'
import type { Address, Hex, PublicClient } from 'viem'
import type { AdminProbe, ContractAbi } from '~/types/analysis'
import { DEFAULT_TIMEOUT_MS } from './http'

export const PUBLIC_ETHEREUM_RPC_URL = 'https://ethereum-rpc.publicnode.com'

/** Storage slot that EIP-1967 proxies keep their implementation address in. */
export const EIP1967_IMPLEMENTATION_SLOT: Hex =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'

export type ChainClient = Pick<PublicClient, 'getStorageAt' | 'getCode' | 'readContract'>

const OWNER_ABI = parseAbi(['function owner() view returns (address)'])
const SAFE_ABI = parseAbi([
  'function getThreshold() view returns (uint256)',
  'function getOwners() view returns (address[])',
])

export function createChainClient(url: string = PUBLIC_ETHEREUM_RPC_URL): ChainClient {
  return createPublicClient({
    transport: http(url, { batch: true, retryCount: 1, timeout: DEFAULT_TIMEOUT_MS }),
  })
}

/** Returns the raw slot value, or null when the node could not be reached. */
export async function readImplementationSlot(
  client: ChainClient,
  address: Address,
): Promise<string | null> {
  try {
    return (
      (await client.getStorageAt({ address, slot: EIP1967_IMPLEMENTATION_SLOT })) ?? '0x'
    )
  } catch {
    return null
  }
}

async function isContract(
  client: ChainClient,
  address: Address,
): Promise<boolean | null> {
  try {
    const code = await client.getCode({ address })
    return code !== undefined && code !== '0x'
  } catch {
    return null
  }
}

async function readMultisig(
  client: ChainClient,
  address: Address,
): Promise<{ threshold: number; signers: number } | null> {
  try {
    const [threshold, owners] = await Promise.all([
      client.readContract({ address, abi: SAFE_ABI, functionName: 'getThreshold' }),
      client.readContract({ address, abi: SAFE_ABI, functionName: 'getOwners' }),
    ])
    return { threshold: Number(threshold), signers: owners.length }
  } catch {
    return null
  }
}

function declaresOwner(abi: ContractAbi): boolean {
  return abi.some((item) => item.type === 'function' && item.name === 'owner')
}

/**
 * Works out who holds `owner()`. When the ABI is known and has no `owner`
 * function there is nothing to ask; a failed call stays unknown rather than
 * being read as "no owner".
 */
export async function probeAdmin(
  client: ChainClient,
  address: Address,
  abi: ContractAbi | null,
): Promise<AdminProbe> {
  if (abi !== null && !declaresOwner(abi)) return { kind: 'none' }

  let owner: Address
  try {
    owner = await client.readContract({ address, abi: OWNER_ABI, functionName: 'owner' })
  } catch {
    return { kind: 'unknown' }
  }

  const contract = await isContract(client, owner)
  const multisig = contract ? await readMultisig(client, owner) : null
  return { kind: 'found', address: owner, isContract: contract, multisig }
}
