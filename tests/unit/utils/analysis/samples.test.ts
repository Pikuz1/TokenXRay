import { describe, expect, it } from 'vitest'
import { CHECK_IDS } from '~/types/analysis'
import {
  SAMPLE_OPTIONS,
  SAMPLE_TOKENS,
  findSample,
  toSampleOption,
} from '~/utils/analysis/samples'

describe('sample tokens', () => {
  it('ships complete, well-formed analyses marked as samples', () => {
    expect(SAMPLE_TOKENS.length).toBeGreaterThanOrEqual(3)
    for (const sample of SAMPLE_TOKENS) {
      expect(sample.source).toBe('sample')
      expect(sample.results.map((result) => result.id)).toEqual(CHECK_IDS)
      expect(sample.confidence.total).toBe(CHECK_IDS.length)
    }
  })

  it('finds a sample regardless of address casing', () => {
    const first = SAMPLE_TOKENS[0]!
    expect(findSample(first.address.toLowerCase() as typeof first.address)).toBe(first)
  })

  it('returns undefined for other addresses', () => {
    expect(findSample('0x1111111111111111111111111111111111111111')).toBeUndefined()
  })
})

describe('SAMPLE_OPTIONS', () => {
  it('offers one labelled option per sample', () => {
    expect(SAMPLE_OPTIONS).toHaveLength(SAMPLE_TOKENS.length)
    expect(SAMPLE_OPTIONS.map((option) => option.label)).toEqual(
      SAMPLE_TOKENS.map((sample) => sample.token.symbol),
    )
  })

  it('labels a token without a symbol by its short address', () => {
    const sample = SAMPLE_TOKENS[0]!
    const unnamed = { ...sample, token: { ...sample.token, symbol: null } }
    expect(toSampleOption(unnamed).label).toBe(
      `${sample.address.slice(0, 6)}…${sample.address.slice(-4)}`,
    )
  })
})
