import { computed, ref, shallowRef } from 'vue'
import type { Address } from 'viem'
import { useTracker } from '~/composables/useTracker'
import { ANALYSIS_ERROR_MESSAGES } from '~/content/messages'
import type { ConcentrationResult, CoreAnalysis } from '~/types/analysis'
import { ADDRESS_ERROR_MESSAGES, parseAddress } from '~/utils/address'
import {
  analyzeConcentration,
  analyzeCore,
  completeAnalysis,
  splitAnalysis,
} from '~/utils/analysis/analyze'
import type { AnalysisDeps } from '~/utils/analysis/analyze'
import { createDefaultDeps } from '~/utils/analysis/defaults'
import { AnalysisError } from '~/utils/analysis/errors'
import { findSample } from '~/utils/analysis/samples'

export type AnalysisStatus = 'idle' | 'loading' | 'ready' | 'error'
export type SubmitOrigin = 'typed' | 'sample'

/**
 * Drives one analysis at a time: validates the address, shows the fast checks
 * as soon as they arrive, fills in holder concentration later, and falls back
 * to bundled sample data when the live sources cannot be reached.
 */
export function useTokenAnalysis(injectedDeps?: AnalysisDeps) {
  const { track } = useTracker()
  const status = ref<AnalysisStatus>('idle')
  const error = ref<string | null>(null)
  const core = shallowRef<CoreAnalysis | null>(null)
  const concentration = shallowRef<ConcentrationResult | null>(null)

  let deps = injectedDeps
  let latestRun = 0

  const results = computed(() => {
    if (!core.value) return []
    return concentration.value
      ? [...core.value.results, concentration.value]
      : core.value.results
  })
  const analysis = computed(() =>
    core.value && concentration.value
      ? completeAnalysis(core.value, concentration.value)
      : null,
  )
  const pendingConcentration = computed(
    () => core.value !== null && concentration.value === null,
  )

  function fail(message: string) {
    status.value = 'error'
    error.value = message
    core.value = null
    concentration.value = null
  }

  function recover(address: Address, failure: unknown) {
    const kind = failure instanceof AnalysisError ? failure.kind : 'unreachable'
    const sample = kind === 'unreachable' ? findSample(address) : undefined
    if (!sample) return fail(ANALYSIS_ERROR_MESSAGES[kind])

    const split = splitAnalysis(sample)
    core.value = split.core
    concentration.value = split.concentration
    status.value = 'ready'
  }

  async function analyze(input: string, origin: SubmitOrigin = 'typed'): Promise<void> {
    const parsed = parseAddress(input)
    track('address_submitted', { origin, valid: parsed.ok })
    if (!parsed.ok) return fail(ADDRESS_ERROR_MESSAGES[parsed.reason])

    const run = ++latestRun
    status.value = 'loading'
    error.value = null
    core.value = null
    concentration.value = null

    deps ??= createDefaultDeps()
    try {
      const fast = await analyzeCore(parsed.address, deps)
      if (run !== latestRun) return
      core.value = fast
      status.value = 'ready'

      const slow = await analyzeConcentration(
        parsed.address,
        fast.token.totalSupply,
        deps,
      )
      if (run === latestRun) concentration.value = slow
    } catch (failure) {
      if (run === latestRun) recover(parsed.address, failure)
    }
  }

  return { status, error, core, results, analysis, pendingConcentration, analyze }
}
