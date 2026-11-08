import type { Address } from 'viem'
import type { TokenAnalysis } from '~/types/analysis'
import { shortenAddress } from '~/utils/address'
import samples from '~/data/samples.json'

const SAMPLES = samples as TokenAnalysis[]

/** Bundled results, used as quick-start examples and as the offline fallback. */
export const SAMPLE_TOKENS: readonly TokenAnalysis[] = SAMPLES.map((sample) => ({
  ...sample,
  source: 'sample',
}))

export function findSample(address: Address): TokenAnalysis | undefined {
  const wanted = address.toLowerCase()
  return SAMPLE_TOKENS.find((sample) => sample.address.toLowerCase() === wanted)
}

export interface SampleOption {
  address: Address
  label: string
}

export function toSampleOption({ address, token }: TokenAnalysis): SampleOption {
  return { address, label: token.symbol ?? shortenAddress(address) }
}

export const SAMPLE_OPTIONS: readonly SampleOption[] = SAMPLE_TOKENS.map(toSampleOption)
