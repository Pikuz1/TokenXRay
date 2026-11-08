<script setup lang="ts">
import { computed } from 'vue'
import { formatPercent } from '~/content/present'

const props = defineProps<{ top1: number; top10: number }>()

const clamp = (value: number) => Math.min(100, Math.max(0, value))
const label = computed(
  () =>
    `Largest wallet ${formatPercent(props.top1)}, top 10 wallets ${formatPercent(props.top10)} of supply`,
)
</script>

<template>
  <div class="bar" role="img" :aria-label="label">
    <div class="bar__top10" :style="{ width: `${clamp(top10)}%` }" />
    <div class="bar__top1" :style="{ width: `${clamp(top1)}%` }" />
  </div>
</template>

<style scoped>
.bar {
  position: relative;
  height: 0.5rem;
  margin: 0.5rem 0 0.75rem;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}

.bar__top10,
.bar__top1 {
  position: absolute;
  inset: 0 auto 0 0;
}

.bar__top10 {
  background: color-mix(in srgb, var(--accent) 45%, transparent);
}

.bar__top1 {
  background: var(--accent);
}
</style>
