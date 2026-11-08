import { describe, expect, it } from 'vitest'
import type { AdminProbe, HolderSnapshot } from '~/types/analysis'
import { detectAdmin } from '~/utils/detectors/admin'
import { detectConcentration } from '~/utils/detectors/concentration'
import { summariseConfidence } from '~/utils/detectors/confidence'
import { detectUpgradeable } from '~/utils/detectors/upgradeable'
import { detectVerified } from '~/utils/detectors/verified'

const OWNER = '0x1111111111111111111111111111111111111111'
const SLOT_SET = `0x${'0'.repeat(24)}${'ab'.repeat(20)}`
const SLOT_EMPTY = `0x${'0'.repeat(64)}`

describe('detectVerified', () => {
  it.each([
    [true, 'yes'],
    [false, 'no'],
    [null, 'unknown'],
  ] as const)('%s -> %s', (input, status) => {
    expect(detectVerified(input)).toEqual({ id: 'verified', status, evidence: [] })
  })
})

describe('detectUpgradeable', () => {
  it('flags a populated implementation slot', () => {
    const result = detectUpgradeable({
      implementationSlot: SLOT_SET,
      explorerIsProxy: null,
    })
    expect(result.status).toBe('yes')
    expect(result.evidence).toEqual(['EIP-1967 implementation slot is set'])
  })

  it('flags an explorer proxy report even when the slot is empty', () => {
    const result = detectUpgradeable({
      implementationSlot: SLOT_EMPTY,
      explorerIsProxy: true,
    })
    expect(result.status).toBe('yes')
    expect(result.evidence).toEqual(['Explorer reports a proxy contract'])
  })

  it('reports no when the slot is empty and the explorer disagrees', () => {
    const result = detectUpgradeable({
      implementationSlot: SLOT_EMPTY,
      explorerIsProxy: false,
    })
    expect(result).toEqual({ id: 'upgradeable', status: 'no', evidence: [] })
  })

  it('treats a bare 0x slot value as empty', () => {
    expect(
      detectUpgradeable({ implementationSlot: '0x', explorerIsProxy: null }).status,
    ).toBe('no')
  })

  it('is unknown when nothing could be read', () => {
    const result = detectUpgradeable({ implementationSlot: null, explorerIsProxy: null })
    expect(result.status).toBe('unknown')
  })
})

describe('detectAdmin', () => {
  it('is unknown when the probe failed', () => {
    expect(detectAdmin({ kind: 'unknown' })).toEqual({
      id: 'admin',
      status: 'unknown',
      evidence: [],
      control: 'unknown',
    })
  })

  it('reports no admin when there is no owner', () => {
    expect(detectAdmin({ kind: 'none' })).toMatchObject({ status: 'no', control: 'none' })
  })

  it('recognises a multisig owner', () => {
    const probe: AdminProbe = {
      kind: 'found',
      address: OWNER,
      isContract: true,
      multisig: { threshold: 3, signers: 5 },
    }
    expect(detectAdmin(probe)).toEqual({
      id: 'admin',
      status: 'yes',
      evidence: ['Safe-style owner with threshold 3 of 5'],
      control: 'multisig',
      address: OWNER,
      threshold: 3,
      signers: 5,
    })
  })

  it('recognises a contract owner that is not a multisig', () => {
    const result = detectAdmin({
      kind: 'found',
      address: OWNER,
      isContract: true,
      multisig: null,
    })
    expect(result).toMatchObject({
      control: 'contract',
      evidence: ['owner() is a contract'],
    })
  })

  it('recognises a single wallet owner', () => {
    const result = detectAdmin({
      kind: 'found',
      address: OWNER,
      isContract: false,
      multisig: null,
    })
    expect(result).toMatchObject({ control: 'single-wallet', address: OWNER })
  })

  it('keeps control unknown when the owner type could not be determined', () => {
    const result = detectAdmin({
      kind: 'found',
      address: OWNER,
      isContract: null,
      multisig: null,
    })
    expect(result).toMatchObject({ status: 'yes', control: 'unknown', address: OWNER })
  })
})

describe('detectConcentration', () => {
  const holder = (index: number, value: bigint) => ({
    address: `0x${index.toString(16).padStart(40, '0')}` as const,
    value,
  })

  it.each([
    ['no snapshot', null],
    ['zero supply', { holders: [holder(1, 5n)], totalSupply: 0n }],
    ['no holders', { holders: [], totalSupply: 100n }],
  ] as const)('is unknown for %s', (_label, snapshot) => {
    expect(detectConcentration(snapshot as HolderSnapshot | null)).toEqual({
      id: 'concentration',
      status: 'unknown',
      evidence: [],
      level: 'unknown',
      top1: null,
      top10: null,
    })
  })

  it('computes top shares from unsorted holders and flags high concentration', () => {
    const snapshot: HolderSnapshot = {
      holders: [holder(1, 10n), holder(2, 50n), holder(3, 10n), holder(4, 10n)],
      totalSupply: 100n,
    }
    expect(detectConcentration(snapshot)).toMatchObject({
      status: 'yes',
      level: 'high',
      top1: 50,
      top10: 80,
      evidence: ['Based on the 4 largest listed wallets'],
    })
  })

  it('only counts the ten largest wallets', () => {
    const holders = Array.from({ length: 12 }, (_, i) => holder(i + 1, 5n))
    const result = detectConcentration({ holders, totalSupply: 1000n })
    expect(result).toMatchObject({ top1: 0.5, top10: 5, level: 'low' })
    expect(result.evidence).toEqual(['Based on the 10 largest listed wallets'])
  })

  it('reports a medium level between the thresholds', () => {
    const snapshot: HolderSnapshot = {
      holders: [holder(1, 20n), holder(2, 20n)],
      totalSupply: 100n,
    }
    expect(detectConcentration(snapshot).level).toBe('medium')
  })

  it('handles equal balances when sorting', () => {
    const snapshot: HolderSnapshot = {
      holders: [holder(1, 7n), holder(2, 7n), holder(3, 9n)],
      totalSupply: 100n,
    }
    expect(detectConcentration(snapshot).top1).toBe(9)
  })
})

describe('summariseConfidence', () => {
  it('counts the checks that produced an answer', () => {
    const results = [
      { id: 'pause', status: 'yes', evidence: [] },
      { id: 'mint', status: 'no', evidence: [] },
      { id: 'admin', status: 'unknown', evidence: [] },
    ] as const
    expect(summariseConfidence(results)).toEqual({ completed: 2, total: 3 })
  })
})
