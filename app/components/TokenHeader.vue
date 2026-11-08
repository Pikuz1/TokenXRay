<script setup lang="ts">
import { computed } from 'vue'
import type { AnalysisSource, TokenSummary } from '~/types/analysis'
import { shortenAddress } from '~/utils/address'

const props = defineProps<{
  token: TokenSummary
  address: string
  source: AnalysisSource
  fetchedAt: string
}>()

const title = computed(() => props.token.name ?? 'Unnamed token')
const shortAddress = computed(() => shortenAddress(props.address))
const readOn = computed(() => props.fetchedAt.slice(0, 10))
</script>

<template>
  <header class="token">
    <h2 class="token__title">
      {{ title }}
      <span v-if="token.symbol" class="token__symbol">{{ token.symbol }}</span>
      <span v-if="source === 'sample'" class="token__badge">Sample data</span>
    </h2>
    <p class="token__meta">
      <code :title="address">{{ shortAddress }}</code>
      · Ethereum · data read {{ readOn }}
    </p>
    <p v-if="source === 'sample'" class="token__note">
      Live data could not be loaded, so this is a saved sample from {{ readOn }}.
    </p>
  </header>
</template>

<style scoped>
.token__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.5rem;
}

.token__symbol {
  color: var(--muted);
  font-size: 1rem;
  font-weight: 500;
}

.token__badge {
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--warn);
  border-radius: 999px;
  color: var(--warn);
  font-size: 0.75rem;
  font-weight: 600;
}

.token__meta,
.token__note {
  margin: 0.25rem 0 0;
  color: var(--muted);
  font-size: 0.9rem;
}
</style>
