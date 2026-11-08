import type { CheckResult, Confidence } from '~/types/analysis'

export function summariseConfidence(results: readonly CheckResult[]): Confidence {
  return {
    completed: results.filter((result) => result.status !== 'unknown').length,
    total: results.length,
  }
}
