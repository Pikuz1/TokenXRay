<script setup lang="ts">
import type { Confidence } from '~/types/analysis'

defineProps<{ confidence: Confidence }>()
</script>

<template>
  <p class="confidence">
    <strong>Data confidence:</strong>
    {{ confidence.completed }} of {{ confidence.total }} checks completed.
    <template v-if="confidence.completed < confidence.total">
      “Unknown” means the data was unavailable, not that the answer is no.
    </template>
  </p>
</template>

<style scoped>
.confidence {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}
</style>
