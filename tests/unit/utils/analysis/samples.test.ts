import { describe, expect, it } from 'vitest'
import { CHECK_IDS } from '~/types/analysis'
import { SAMPLE_TOKENS, findSample } from '~/utils/analysis/samples'

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
