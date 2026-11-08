import type { ContractAbi } from '~/types/analysis'

const fn = (name: string, stateMutability = 'nonpayable') => ({
  type: 'function',
  name,
  stateMutability,
})

const erc20Core = [
  fn('transfer'),
  fn('approve'),
  fn('transferFrom'),
  fn('balanceOf', 'view'),
  fn('totalSupply', 'view'),
  { type: 'event', name: 'Transfer' },
  { type: 'constructor' },
]

/** Regulated stablecoin style: pausable, blacklist, mint and an owner. */
export const POWERFUL_TOKEN_ABI: ContractAbi = [
  ...erc20Core,
  fn('pause'),
  fn('unpause'),
  fn('paused', 'view'),
  fn('blacklist'),
  fn('unBlacklist'),
  fn('isBlacklisted', 'view'),
  fn('mint'),
  fn('configureMinter'),
  fn('owner', 'view'),
]

/** Plain ERC-20 with no admin powers. */
export const PLAIN_TOKEN_ABI: ContractAbi = erc20Core

/** Names that contain look-alike letters but none of the whole words we look for. */
export const LOOKALIKE_TOKEN_ABI: ContractAbi = [
  ...erc20Core,
  fn('urbanRenewal'),
  fn('bankTransfer'),
  fn('compassBearing', 'view'),
  fn('mintedAt', 'view'),
  fn('minTransferAmount', 'view'),
]

/** Camel-case names where the keyword is split across words, as in USDT. */
export const SPLIT_WORD_TOKEN_ABI: ContractAbi = [
  ...erc20Core,
  fn('addBlackList'),
  fn('removeBlackList'),
  fn('getBlackListStatus', 'view'),
]
