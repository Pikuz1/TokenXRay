import type { Address } from 'viem'
import type {
  ConcentrationResult,
  ContractInfo,
  CoreAnalysis,
  TokenAnalysis,
  TokenInfo,
  TokenSummary,
} from '~/types/analysis'
import { attempt } from '~/utils/async'
import type { BlockscoutClient } from '~/utils/data/blockscout'
import { probeAdmin, readImplementationSlot } from '~/utils/data/rpc'
import type { ChainClient } from '~/utils/data/rpc'
import {
  detectAdmin,
  detectConcentration,
  detectFreeze,
  detectMint,
  detectPause,
  detectUpgradeable,
  detectVerified,
  summariseConfidence,
} from '~/utils/detectors'
import { AnalysisError } from './errors'
import { mergeAbis } from './merge-abi'

export interface AnalysisDeps {
  explorer: BlockscoutClient
  chain: ChainClient
  now?: () => Date
}

const UNKNOWN_TOKEN: TokenInfo = {
  name: null,
  symbol: null,
  decimals: null,
  totalSupply: null,
  holdersCount: null,
}

function summarise(token: TokenInfo): TokenSummary {
  return { ...token, totalSupply: token.totalSupply?.toString() ?? null }
}

function isFullyVerified(
  contract: ContractInfo | null,
  implementation: ContractInfo | null,
) {
  if (contract === null) return null
  if (!contract.isProxy) return contract.isVerified
  return implementation === null ? null : contract.isVerified && implementation.isVerified
}

/**
 * Runs every check that needs only quick lookups. Holder concentration is
 * left out because the holder list is slow; see `analyzeConcentration`.
 */
export async function analyzeCore(
  address: Address,
  { explorer, chain, now = () => new Date() }: AnalysisDeps,
): Promise<CoreAnalysis> {
  const [token, contract, slot] = await Promise.all([
    attempt(explorer.getToken(address)),
    attempt(explorer.getContract(address)),
    readImplementationSlot(chain, address),
  ])

  if (token === null) throw new AnalysisError('not-a-token')
  if (token === undefined && contract === undefined)
    throw new AnalysisError('unreachable')

  const known = contract ?? null
  const implementationAddress = known?.implementations[0]
  const implementation = implementationAddress
    ? ((await attempt(explorer.getContract(implementationAddress))) ?? null)
    : null

  // A proxy's own ABI says nothing about the token's powers, so without the
  // implementation's ABI the ABI-based checks cannot be answered.
  const abi =
    known?.isProxy && !implementation?.abi
      ? null
      : mergeAbis(known?.abi, implementation?.abi)

  return {
    address,
    token: summarise(token ?? UNKNOWN_TOKEN),
    results: [
      detectVerified(isFullyVerified(known, implementation)),
      detectUpgradeable({
        implementationSlot: slot,
        explorerIsProxy: known?.isProxy ?? null,
      }),
      detectPause(abi),
      detectFreeze(abi),
      detectMint(abi),
      detectAdmin(await probeAdmin(chain, address, abi)),
    ],
    source: 'live',
    fetchedAt: now().toISOString(),
  }
}

/** Reads the top holders and measures how much of the supply they control. */
export async function analyzeConcentration(
  address: Address,
  totalSupply: string | null,
  { explorer }: Pick<AnalysisDeps, 'explorer'>,
): Promise<ConcentrationResult> {
  const holders =
    totalSupply === null ? undefined : await attempt(explorer.getHolders(address))
  return detectConcentration(
    holders && totalSupply !== null
      ? { holders, totalSupply: BigInt(totalSupply) }
      : null,
  )
}

export function completeAnalysis(
  core: CoreAnalysis,
  concentration: ConcentrationResult,
): TokenAnalysis {
  const results = [...core.results, concentration]
  return { ...core, results, confidence: summariseConfidence(results) }
}
