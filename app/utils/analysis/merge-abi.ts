import type { ContractAbi } from '~/types/analysis'

/** Concatenates ABIs, ignoring missing ones; null when none are available. */
export function mergeAbis(
  ...abis: (ContractAbi | null | undefined)[]
): ContractAbi | null {
  const present = abis.filter((abi): abi is ContractAbi => abi != null)
  return present.length > 0 ? present.flat() : null
}
