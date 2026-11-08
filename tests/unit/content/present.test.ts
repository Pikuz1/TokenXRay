import { describe, expect, it } from 'vitest'
import { CHECK_COPY } from '~/content/check-copy'
import { formatPercent, presentCheck } from '~/content/present'
import { CHECK_IDS } from '~/types/analysis'
import type { AdminResult, AnyCheckResult, ConcentrationResult } from '~/types/analysis'

const OWNER = '0x1111111111111111111111111111111111111111'

const plain = (
  id: 'verified' | 'upgradeable' | 'pause' | 'freeze' | 'mint',
  status: 'yes' | 'no' | 'unknown',
  evidence: string[] = [],
): AnyCheckResult => ({ id, status, evidence })

const admin = (overrides: Partial<AdminResult>): AdminResult => ({
  id: 'admin',
  status: 'yes',
  evidence: [],
  control: 'unknown',
  ...overrides,
})

const concentration = (overrides: Partial<ConcentrationResult>): ConcentrationResult => ({
  id: 'concentration',
  status: 'yes',
  evidence: [],
  level: 'low',
  top1: 5,
  top10: 20.04,
  ...overrides,
})

describe('formatPercent', () => {
  it('uses one decimal place', () => {
    expect(formatPercent(23.918)).toBe('23.9%')
    expect(formatPercent(5)).toBe('5.0%')
  })
})

describe('CHECK_COPY', () => {
  it('has a question and a reason for every check', () => {
    for (const id of CHECK_IDS) {
      expect(CHECK_COPY[id].question).toMatch(/\?$/)
      expect(CHECK_COPY[id].whyItMatters.length).toBeGreaterThan(20)
    }
  })
})

describe('presentCheck for yes/no checks', () => {
  it.each([
    [
      'verified',
      'ok',
      'Code is public and verified',
      'attention',
      'Code is not verified',
    ],
    [
      'upgradeable',
      'attention',
      'Rules can be changed later',
      'ok',
      'No upgrade mechanism found',
    ],
    [
      'pause',
      'attention',
      'Issuer can pause all transfers',
      'ok',
      'No pause function found',
    ],
    [
      'freeze',
      'attention',
      'Issuer can block specific wallets',
      'ok',
      'No wallet-blocking function found',
    ],
    ['mint', 'attention', 'New tokens can be created', 'ok', 'No minting function found'],
  ] as const)('%s', (id, yesTone, yesHeadline, noTone, noHeadline) => {
    expect(presentCheck(plain(id, 'yes'))).toMatchObject({
      tone: yesTone,
      headline: yesHeadline,
    })
    expect(presentCheck(plain(id, 'no'))).toMatchObject({
      tone: noTone,
      headline: noHeadline,
    })
  })

  it('lists matched function names as detail', () => {
    const result = presentCheck(plain('pause', 'yes', ['pause', 'unpause']))
    expect(result.detail).toBe('Functions found: pause, unpause')
  })

  it('joins evidence sentences as detail', () => {
    const result = presentCheck(
      plain('upgradeable', 'yes', ['Slot is set', 'Explorer agrees']),
    )
    expect(result.detail).toBe('Slot is set. Explorer agrees.')
  })

  it('has no detail without evidence', () => {
    expect(presentCheck(plain('verified', 'yes')).detail).toBeNull()
  })

  it('shows a neutral unknown state', () => {
    expect(presentCheck(plain('mint', 'unknown'))).toEqual({
      tone: 'neutral',
      badge: 'Unknown',
      headline: 'Could not be checked',
      detail: 'The public data needed to answer this was not available.',
    })
  })
})

describe('presentCheck for admin control', () => {
  it('describes a multisig', () => {
    const result = presentCheck(
      admin({ control: 'multisig', threshold: 3, signers: 5, address: OWNER }),
    )
    expect(result).toMatchObject({
      tone: 'ok',
      badge: 'Multi-signature',
      headline: 'Multi-signature: 3 of 5 must approve',
    })
  })

  it('describes a single wallet', () => {
    expect(presentCheck(admin({ control: 'single-wallet' }))).toMatchObject({
      tone: 'attention',
      headline: 'Controlled by one wallet',
    })
  })

  it('describes a contract owner', () => {
    expect(presentCheck(admin({ control: 'contract' }))).toMatchObject({
      tone: 'neutral',
      headline: 'Controlled by a contract',
    })
  })

  it('describes the absence of an owner function without calling it a flaw', () => {
    const result = presentCheck(admin({ status: 'no', control: 'none' }))
    expect(result).toMatchObject({ tone: 'neutral', badge: 'No owner found' })
    expect(result.detail).toContain('roles')
  })

  it('describes an owner of undetermined type', () => {
    expect(presentCheck(admin({ control: 'unknown' }))).toMatchObject({
      badge: 'Owner found',
      detail: null,
    })
  })

  it('is unknown when the probe failed', () => {
    expect(presentCheck(admin({ status: 'unknown', control: 'unknown' })).badge).toBe(
      'Unknown',
    )
  })
})

describe('presentCheck for concentration', () => {
  it('reports a low level as ok', () => {
    expect(presentCheck(concentration({}))).toMatchObject({
      tone: 'ok',
      badge: 'Low',
      headline: 'Top 10 wallets hold 20.0%',
    })
  })

  it.each([
    ['medium', 'Medium'],
    ['high', 'High'],
  ] as const)('flags a %s level', (level, badge) => {
    expect(presentCheck(concentration({ level }))).toMatchObject({
      tone: 'attention',
      badge,
    })
  })

  it('mentions the largest wallet and the exchange caveat', () => {
    const { detail } = presentCheck(concentration({ top1: 12.34 }))
    expect(detail).toContain('The largest wallet holds 12.3%')
    expect(detail).toContain('Exchanges and contracts')
  })

  it.each([
    ['unknown level', { level: 'unknown' as const }],
    ['missing top 1', { top1: null }],
    ['missing top 10', { top10: null }],
  ])('is unknown for %s', (_label, overrides) => {
    expect(presentCheck(concentration(overrides)).badge).toBe('Unknown')
  })
})
