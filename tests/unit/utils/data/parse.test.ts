import { describe, expect, it } from 'vitest'
import {
  isRecord,
  readAddress,
  readBigInt,
  readInteger,
  readString,
} from '~/utils/data/parse'

describe('parse helpers', () => {
  it('isRecord accepts plain objects only', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isRecord('x')).toBe(false)
  })

  it('readString rejects empty and non-strings', () => {
    expect(readString('USDC')).toBe('USDC')
    expect(readString('')).toBeNull()
    expect(readString(5)).toBeNull()
  })

  it('readBigInt parses digit strings only', () => {
    expect(readBigInt('46166509902498812')).toBe(46166509902498812n)
    expect(readBigInt('-1')).toBeNull()
    expect(readBigInt('1.5')).toBeNull()
    expect(readBigInt(10)).toBeNull()
  })

  it('readInteger accepts numbers and numeric strings', () => {
    expect(readInteger('6')).toBe(6)
    expect(readInteger(18)).toBe(18)
    expect(readInteger('abc')).toBeNull()
    expect(readInteger(1.5)).toBeNull()
    expect(readInteger(null)).toBeNull()
  })

  it('readAddress accepts hex addresses regardless of case', () => {
    const address = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    expect(readAddress(address)).toBe(address)
    expect(readAddress('0x123')).toBeNull()
    expect(readAddress(undefined)).toBeNull()
  })
})
