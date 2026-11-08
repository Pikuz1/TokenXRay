import { createBlockscoutClient } from '~/utils/data/blockscout'
import { createChainClient } from '~/utils/data/rpc'
import type { AnalysisDeps } from './analyze'

/** Public Ethereum mainnet sources; no keys or accounts needed. */
export function createDefaultDeps(): AnalysisDeps {
  return { explorer: createBlockscoutClient(), chain: createChainClient() }
}
