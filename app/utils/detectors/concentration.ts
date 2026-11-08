import { CONCENTRATION_THRESHOLDS } from '~/config/thresholds'
import type {
  ConcentrationLevel,
  ConcentrationResult,
  HolderSnapshot,
} from '~/types/analysis'

const BASIS_POINTS = 10_000n
const TOP_GROUP = 10

function sharePercent(part: bigint, total: bigint): number {
  return Number((part * BASIS_POINTS) / total) / 100
}

function levelFor(top10: number): ConcentrationLevel {
  if (top10 >= CONCENTRATION_THRESHOLDS.high) return 'high'
  if (top10 >= CONCENTRATION_THRESHOLDS.medium) return 'medium'
  return 'low'
}

export function detectConcentration(
  snapshot: HolderSnapshot | null,
): ConcentrationResult {
  if (snapshot === null || snapshot.totalSupply <= 0n || snapshot.holders.length === 0) {
    return {
      id: 'concentration',
      status: 'unknown',
      evidence: [],
      level: 'unknown',
      top1: null,
      top10: null,
    }
  }

  const values = snapshot.holders
    .map((holder) => holder.value)
    .sort((a, b) => (a === b ? 0 : a > b ? -1 : 1))
  const sum = (items: bigint[]) => items.reduce((total, value) => total + value, 0n)

  const top1 = sharePercent(values[0]!, snapshot.totalSupply)
  const top10 = sharePercent(sum(values.slice(0, TOP_GROUP)), snapshot.totalSupply)

  return {
    id: 'concentration',
    status: 'yes',
    evidence: [
      `Based on the ${Math.min(values.length, TOP_GROUP)} largest listed wallets`,
    ],
    level: levelFor(top10),
    top1,
    top10,
  }
}
