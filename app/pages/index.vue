<script setup lang="ts">
import AddressForm from '~/components/AddressForm.vue'
import CheckCard from '~/components/CheckCard.vue'
import ConfidenceNote from '~/components/ConfidenceNote.vue'
import PendingCard from '~/components/PendingCard.vue'
import TokenHeader from '~/components/TokenHeader.vue'
import { useTokenAnalysis } from '~/composables/useTokenAnalysis'
import { useTracker } from '~/composables/useTracker'
import { CHECK_COPY } from '~/content/check-copy'
import type { AnalysisSource } from '~/types/analysis'
import { SAMPLE_OPTIONS } from '~/utils/analysis/samples'
import type { SampleOption } from '~/utils/analysis/samples'

const { track } = useTracker()
const { status, error, core, results, analysis, pendingConcentration, analyze } =
  useTokenAnalysis()

function printReport(source: AnalysisSource) {
  track('report_printed', { source })
  window.print()
}

function pickSample(option: SampleOption) {
  track('sample_token_clicked', { symbol: option.label })
  return analyze(option.address, 'sample')
}
</script>

<template>
  <main class="page">
    <header class="page__intro no-print">
      <h1>Token X-Ray</h1>
      <p class="page__lead">
        Paste a token address to see what its issuer can do with it: pause transfers,
        block wallets, create new tokens or change the rules.
      </p>
      <p class="page__principle">
        A power is not automatically a flaw. A regulated issuer may need a freeze
        function. What matters is whether the power is disclosed and who controls it.
      </p>
    </header>

    <AddressForm
      class="no-print"
      :samples="SAMPLE_OPTIONS"
      :busy="status === 'loading'"
      :error="error"
      @submit="analyze($event)"
      @pick="pickSample"
    />

    <p v-if="status === 'loading'" class="page__status no-print" role="status">
      Reading the contract…
    </p>

    <section v-if="core" class="page__results" aria-label="Results">
      <TokenHeader
        :token="core.token"
        :address="core.address"
        :source="core.source"
        :fetched-at="core.fetchedAt"
      />
      <div class="page__cards">
        <CheckCard v-for="result in results" :key="result.id" :result="result" />
        <PendingCard
          v-if="pendingConcentration"
          :question="CHECK_COPY.concentration.question"
          message="Reading the holder list. This can take up to 30 seconds for large tokens."
        />
      </div>
      <ConfidenceNote v-if="analysis" :confidence="analysis.confidence" />
      <button
        v-if="analysis"
        class="page__print no-print"
        type="button"
        @click="printReport(analysis.source)"
      >
        Print or save as PDF
      </button>
    </section>

    <footer class="page__footer">
      Independent open-source prototype. Results are automated hints derived from public
      data, so some powers can be missed. This is not a rating, an audit or investment
      advice.
    </footer>
  </main>
</template>

<style scoped>
.page {
  max-width: 44rem;
  margin: 0 auto;
  padding: 2rem 1rem 3rem;
}

.page__intro h1 {
  margin: 0 0 0.5rem;
}

.page__lead {
  margin: 0 0 0.5rem;
}

.page__principle {
  margin: 0 0 1.5rem;
  color: var(--muted);
  font-size: 0.9rem;
}

.page__status {
  color: var(--muted);
}

.page__results {
  display: grid;
  gap: 1rem;
  margin-top: 2rem;
}

.page__cards {
  display: grid;
  gap: 0.75rem;
}

.page__print {
  justify-self: start;
  padding: 0.5rem 1rem;
  border: 1px solid var(--accent);
  border-radius: 0.375rem;
  background: none;
  color: var(--accent);
  font: inherit;
  cursor: pointer;
}

.page__footer {
  margin-top: 2.5rem;
  color: var(--muted);
  font-size: 0.8rem;
}
</style>
