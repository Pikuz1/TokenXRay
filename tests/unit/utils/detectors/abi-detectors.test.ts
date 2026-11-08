import { describe, expect, it } from 'vitest'
import {
  LOOKALIKE_TOKEN_ABI,
  PLAIN_TOKEN_ABI,
  POWERFUL_TOKEN_ABI,
  SPLIT_WORD_TOKEN_ABI,
} from '@fixtures/abis'
import { combineSignals, matchFunctions, splitWords } from '~/utils/detectors/abi'
import { detectFreeze } from '~/utils/detectors/freeze'
import { detectMint } from '~/utils/detectors/mint'
import { detectPause } from '~/utils/detectors/pause'

describe('splitWords', () => {
  it.each([
    ['isBlackListed', ['is', 'black', 'listed']],
    ['MINTER_ROLE', ['minter', 'role']],
    ['pause', ['pause']],
    ['erc20Transfer', ['erc20', 'transfer']],
    ['__', []],
  ])('splits %s', (input, expected) => {
    expect(splitWords(input)).toEqual(expected)
  })
})

describe('matchFunctions', () => {
  it('returns unique sorted function names and ignores non-functions', () => {
    const abi = [
      { type: 'function', name: 'pause' },
      { type: 'function', name: 'pause' },
      { type: 'function', name: 'paused' },
      { type: 'event', name: 'Paused' },
      { type: 'function' },
    ]
    expect(matchFunctions(abi, new Set(['pause', 'paused']))).toEqual(['pause', 'paused'])
  })
})

describe('freeze detector with split words', () => {
  it('matches keywords split across camel-case words', () => {
    expect(detectFreeze(SPLIT_WORD_TOKEN_ABI)).toEqual({
      id: 'freeze',
      status: 'yes',
      evidence: ['addBlackList', 'getBlackListStatus', 'removeBlackList'],
    })
  })
})

describe('combineSignals', () => {
  it.each([
    [[true, false], 'yes'],
    [[null, true], 'yes'],
    [[false, null], 'no'],
    [[null, null], 'unknown'],
    [[], 'unknown'],
  ] as const)('%j -> %s', (signals, expected) => {
    expect(combineSignals(signals)).toBe(expected)
  })
})

describe.each([
  ['pause', detectPause, ['pause', 'paused', 'unpause']],
  ['freeze', detectFreeze, ['blacklist', 'isBlacklisted', 'unBlacklist']],
  ['mint', detectMint, ['configureMinter', 'mint']],
] as const)('%s detector', (id, detect, expectedEvidence) => {
  it('finds the power in a token that has it', () => {
    expect(detect(POWERFUL_TOKEN_ABI)).toEqual({
      id,
      status: 'yes',
      evidence: [...expectedEvidence],
    })
  })

  it('reports no power for a plain token', () => {
    expect(detect(PLAIN_TOKEN_ABI)).toEqual({ id, status: 'no', evidence: [] })
  })

  it('is not fooled by look-alike names', () => {
    expect(detect(LOOKALIKE_TOKEN_ABI).status).toBe('no')
  })

  it('is unknown without an ABI', () => {
    expect(detect(null)).toEqual({ id, status: 'unknown', evidence: [] })
  })
})
