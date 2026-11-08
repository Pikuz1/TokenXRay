import type {
  AbiItem,
  CheckId,
  CheckResult,
  ContractAbi,
  Finding,
} from '~/types/analysis'

const CAMEL_BOUNDARY = /([a-z0-9])([A-Z])/g
const NON_ALPHANUMERIC = /[^A-Za-z0-9]+/

/** Splits an identifier into lowercase words: `isBlackListed` -> `is`, `black`, `listed`. */
export function splitWords(identifier: string): string[] {
  return identifier
    .replace(CAMEL_BOUNDARY, '$1 $2')
    .split(NON_ALPHANUMERIC)
    .filter(Boolean)
    .map((word) => word.toLowerCase())
}

function isNamedFunction(item: AbiItem): item is AbiItem & { name: string } {
  return item.type === 'function' && typeof item.name === 'string'
}

/** Words plus each pair of neighbours joined, so `addBlackList` also yields `blacklist`. */
function candidateWords(identifier: string): string[] {
  const words = splitWords(identifier)
  const joined = words.slice(1).map((word, index) => `${words[index]}${word}`)
  return [...words, ...joined]
}

/** Names of functions in the ABI that contain at least one of the given whole words. */
export function matchFunctions(abi: ContractAbi, words: ReadonlySet<string>): string[] {
  const matches = new Set<string>()
  for (const item of abi) {
    if (
      isNamedFunction(item) &&
      candidateWords(item.name).some((word) => words.has(word))
    ) {
      matches.add(item.name)
    }
  }
  return [...matches].sort()
}

/**
 * Builds a detector that reports whether a contract exposes functions whose
 * names contain any of the given words. Without an ABI the answer is unknown.
 */
export function createAbiDetector<Id extends CheckId>(id: Id, words: readonly string[]) {
  const wordSet: ReadonlySet<string> = new Set(words)
  return (abi: ContractAbi | null): CheckResult<Id> => {
    if (abi === null) return { id, status: 'unknown', evidence: [] }
    const evidence = matchFunctions(abi, wordSet)
    const status: Finding = evidence.length > 0 ? 'yes' : 'no'
    return { id, status, evidence }
  }
}

/** Combines independent signals: any positive wins, else any negative, else unknown. */
export function combineSignals(signals: readonly (boolean | null)[]): Finding {
  if (signals.includes(true)) return 'yes'
  if (signals.includes(false)) return 'no'
  return 'unknown'
}
