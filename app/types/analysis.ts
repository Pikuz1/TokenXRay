import type { Address } from 'viem'

export type CheckId =
  'verified' | 'upgradeable' | 'pause' | 'freeze' | 'mint' | 'admin' | 'concentration'

export const CHECK_IDS: readonly CheckId[] = [
  'verified',
  'upgradeable',
  'pause',
  'freeze',
  'mint',
  'admin',
  'concentration',
]

/** `yes` and `no` are answers; `unknown` means the data to answer was missing. */
export type Finding = 'yes' | 'no' | 'unknown'

export interface AbiItem {
  type: string
  name?: string
  stateMutability?: string
}

export type ContractAbi = readonly AbiItem[]

export interface CheckResult<Id extends CheckId = CheckId> {
  id: Id
  status: Finding
  /** Short facts the finding is based on, such as matched function names. */
  evidence: string[]
}

export type AdminControl = 'none' | 'single-wallet' | 'contract' | 'multisig' | 'unknown'

export interface AdminResult extends CheckResult<'admin'> {
  control: AdminControl
  address?: Address
  threshold?: number
  signers?: number
}

export type ConcentrationLevel = 'low' | 'medium' | 'high' | 'unknown'

export interface ConcentrationResult extends CheckResult<'concentration'> {
  level: ConcentrationLevel
  top1: number | null
  top10: number | null
}

export interface Holder {
  address: Address
  value: bigint
}

export type AdminProbe =
  | { kind: 'unknown' }
  | { kind: 'none' }
  | {
      kind: 'found'
      address: Address
      isContract: boolean | null
      multisig: { threshold: number; signers: number } | null
    }

export interface UpgradeSignals {
  /** Raw EIP-1967 implementation slot value, or null when it could not be read. */
  implementationSlot: string | null
  /** Explorer's own proxy flag, or null when unavailable. */
  explorerIsProxy: boolean | null
}

export interface HolderSnapshot {
  holders: Holder[]
  totalSupply: bigint
}

export interface Confidence {
  completed: number
  total: number
}

export interface ContractInfo {
  isVerified: boolean
  isProxy: boolean
  abi: ContractAbi | null
  implementations: Address[]
}

export interface TokenInfo {
  name: string | null
  symbol: string | null
  decimals: number | null
  totalSupply: bigint | null
  holdersCount: number | null
}

export interface TokenSummary {
  name: string | null
  symbol: string | null
  decimals: number | null
  /** Raw on-chain units, kept as a string so analyses stay JSON-serialisable. */
  totalSupply: string | null
  holdersCount: number | null
}

export type AnalysisSource = 'live' | 'sample'

export type PlainCheckId = Exclude<CheckId, 'admin' | 'concentration'>

/** Discriminated on `id`, so each check's extra fields are available after narrowing. */
export type AnyCheckResult = CheckResult<PlainCheckId> | AdminResult | ConcentrationResult

/** Everything that can be read quickly; holder concentration arrives later. */
export interface CoreAnalysis {
  address: Address
  token: TokenSummary
  /** Results for every check except concentration, in `CHECK_IDS` order. */
  results: AnyCheckResult[]
  source: AnalysisSource
  /** ISO timestamp of when the data was read. */
  fetchedAt: string
}

export interface TokenAnalysis extends Omit<CoreAnalysis, 'results'> {
  /** One result per check, in `CHECK_IDS` order. */
  results: AnyCheckResult[]
  confidence: Confidence
}
