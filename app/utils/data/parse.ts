import { isAddress } from 'viem'
import type { Address } from 'viem'

export type JsonRecord = Record<string, unknown>

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

export function readBigInt(value: unknown): bigint | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
  return BigInt(value)
}

export function readInteger(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value
  return Number.isSafeInteger(parsed) ? (parsed as number) : null
}

export function readAddress(value: unknown): Address | null {
  return typeof value === 'string' && isAddress(value, { strict: false })
    ? (value as Address)
    : null
}
