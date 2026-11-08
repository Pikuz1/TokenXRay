import { getAddress, isAddress, zeroAddress } from 'viem'
import type { Address } from 'viem'

export type AddressError = 'empty' | 'format' | 'checksum' | 'zero'

export type AddressParse =
  { ok: true; address: Address } | { ok: false; reason: AddressError }

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/

export function parseAddress(input: string): AddressParse {
  const value = input.trim()
  if (value === '') return { ok: false, reason: 'empty' }
  if (!HEX_ADDRESS.test(value)) return { ok: false, reason: 'format' }
  if (!isAddress(value)) return { ok: false, reason: 'checksum' }

  const address = getAddress(value)
  if (address === zeroAddress) return { ok: false, reason: 'zero' }
  return { ok: true, address }
}

export const ADDRESS_ERROR_MESSAGES: Record<AddressError, string> = {
  empty: 'Enter a token contract address to get started.',
  format:
    'That does not look like an Ethereum address. It starts with 0x followed by 40 characters.',
  checksum:
    'The capitalisation of this address is off, so it may contain a typo. Check it and try again.',
  zero: 'The zero address is not a token. Try a real contract address.',
}

export function shortenAddress(address: string, visible = 4): string {
  return `${address.slice(0, visible + 2)}…${address.slice(-visible)}`
}
