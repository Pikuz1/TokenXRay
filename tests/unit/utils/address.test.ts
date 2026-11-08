import { describe, expect, it } from 'vitest'
import { ADDRESS_ERROR_MESSAGES, parseAddress, shortenAddress } from '~/utils/address'

const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

describe('parseAddress', () => {
  it('accepts a checksummed address', () => {
    expect(parseAddress(USDC)).toEqual({ ok: true, address: USDC })
  })

  it('normalises an all-lowercase address and trims whitespace', () => {
    expect(parseAddress(`  ${USDC.toLowerCase()}\n`)).toEqual({ ok: true, address: USDC })
  })

  it('rejects empty input', () => {
    expect(parseAddress('   ')).toEqual({ ok: false, reason: 'empty' })
  })

  it.each(['0x123', 'hello', USDC.slice(2), `${USDC}00`, `0x${'g'.repeat(40)}`])(
    'rejects malformed input %s',
    (value) => {
      expect(parseAddress(value)).toEqual({ ok: false, reason: 'format' })
    },
  )

  it('rejects a mixed-case address with a bad checksum', () => {
    const broken = USDC.replace('A0b8', 'a0B8')
    expect(parseAddress(broken)).toEqual({ ok: false, reason: 'checksum' })
  })

  it('rejects the zero address', () => {
    expect(parseAddress(`0x${'0'.repeat(40)}`)).toEqual({ ok: false, reason: 'zero' })
  })
})

describe('ADDRESS_ERROR_MESSAGES', () => {
  it('has a message for every error', () => {
    for (const reason of ['empty', 'format', 'checksum', 'zero'] as const) {
      expect(ADDRESS_ERROR_MESSAGES[reason].length).toBeGreaterThan(10)
    }
  })
})

describe('shortenAddress', () => {
  it('keeps the start and end', () => {
    expect(shortenAddress(USDC)).toBe('0xA0b8…eB48')
  })

  it('honours a custom length', () => {
    expect(shortenAddress(USDC, 6)).toBe('0xA0b869…06eB48')
  })
})
