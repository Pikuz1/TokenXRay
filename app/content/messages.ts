import type { AnalysisErrorKind } from '~/utils/analysis/errors'

export const ANALYSIS_ERROR_MESSAGES: Readonly<Record<AnalysisErrorKind, string>> = {
  'not-a-token':
    'No token was found at that address on Ethereum. Check that it is a token contract and not a regular wallet.',
  unreachable:
    'The public data sources could not be reached. Try again in a moment, or open one of the sample tokens.',
}
