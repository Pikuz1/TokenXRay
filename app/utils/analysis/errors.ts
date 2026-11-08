export type AnalysisErrorKind = 'not-a-token' | 'unreachable'

export class AnalysisError extends Error {
  constructor(readonly kind: AnalysisErrorKind) {
    super(
      kind === 'not-a-token'
        ? 'Address is not a known token'
        : 'Data sources are unreachable',
    )
    this.name = 'AnalysisError'
  }
}
