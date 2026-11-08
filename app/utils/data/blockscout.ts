import type { Address } from 'viem'
import type {
  AbiItem,
  ContractAbi,
  ContractInfo,
  Holder,
  TokenInfo,
} from '~/types/analysis'
import { DataError, fetchJson } from './http'
import type { FetchOptions } from './http'
import { isRecord, readAddress, readBigInt, readInteger, readString } from './parse'

export const BLOCKSCOUT_ETHEREUM_URL = 'https://eth.blockscout.com'

export interface BlockscoutClient {
  getContract(address: Address): Promise<ContractInfo | null>
  getToken(address: Address): Promise<TokenInfo | null>
  getHolders(address: Address): Promise<Holder[]>
}

function parseAbi(value: unknown): ContractAbi | null {
  if (!Array.isArray(value)) return null
  return value.filter(
    (item): item is AbiItem => isRecord(item) && typeof item.type === 'string',
  )
}

function parseImplementations(value: unknown): Address[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const address = isRecord(item) ? readAddress(item.address_hash) : null
    return address ? [address] : []
  })
}

export function parseContract(payload: unknown): ContractInfo {
  const body = isRecord(payload) ? payload : {}
  const implementations = parseImplementations(body.implementations)
  return {
    isVerified: body.is_verified === true,
    isProxy: implementations.length > 0,
    abi: parseAbi(body.abi),
    implementations,
  }
}

export function parseToken(payload: unknown): TokenInfo {
  const body = isRecord(payload) ? payload : {}
  return {
    name: readString(body.name),
    symbol: readString(body.symbol),
    decimals: readInteger(body.decimals),
    totalSupply: readBigInt(body.total_supply),
    holdersCount: readInteger(body.holders_count),
  }
}

export function parseHolders(payload: unknown): Holder[] {
  const items = isRecord(payload) && Array.isArray(payload.items) ? payload.items : []
  return items.flatMap((item) => {
    const address =
      isRecord(item) && isRecord(item.address) ? readAddress(item.address.hash) : null
    const value = isRecord(item) ? readBigInt(item.value) : null
    return address && value !== null ? [{ address, value }] : []
  })
}

export function createBlockscoutClient(
  baseUrl: string = BLOCKSCOUT_ETHEREUM_URL,
  options: FetchOptions = {},
): BlockscoutClient {
  /** Resolves to null when the explorer does not know the address. */
  async function request(path: string): Promise<unknown | null> {
    try {
      return await fetchJson(`${baseUrl}/api/v2${path}`, options)
    } catch (error) {
      if (error instanceof DataError && error.status === 404) return null
      throw error
    }
  }

  return {
    async getContract(address) {
      const payload = await request(`/smart-contracts/${address}`)
      return payload === null ? null : parseContract(payload)
    },
    async getToken(address) {
      const payload = await request(`/tokens/${address}`)
      return payload === null ? null : parseToken(payload)
    },
    async getHolders(address) {
      return parseHolders(await request(`/tokens/${address}/holders`))
    },
  }
}
