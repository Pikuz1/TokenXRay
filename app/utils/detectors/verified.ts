import type { CheckResult } from '~/types/analysis'

export function detectVerified(isVerified: boolean | null): CheckResult<'verified'> {
  if (isVerified === null) return { id: 'verified', status: 'unknown', evidence: [] }
  return { id: 'verified', status: isVerified ? 'yes' : 'no', evidence: [] }
}
