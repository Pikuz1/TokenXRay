<script setup lang="ts">
import type { Tone } from '~/content/present'
import ExplainTip from './ExplainTip.vue'

defineProps<{
  question: string
  tone: Tone
  badge: string
  headline: string
  detail: string | null
  whyItMatters: string
}>()

defineEmits<{ explain: [] }>()
</script>

<template>
  <article class="card" :class="`card--${tone}`">
    <header class="card__header">
      <h3 class="card__question">{{ question }}</h3>
      <span class="card__badge">{{ badge }}</span>
    </header>
    <p class="card__headline">{{ headline }}</p>
    <p v-if="detail" class="card__detail">{{ detail }}</p>
    <slot />
    <ExplainTip :text="whyItMatters" @open="$emit('explain')" />
  </article>
</template>

<style scoped>
.card {
  --tone: var(--info);
  padding: 1rem 1.25rem;
  border: 1px solid var(--border);
  border-left: 4px solid var(--tone);
  border-radius: 0.5rem;
  background: var(--surface);
}

.card--ok {
  --tone: var(--ok);
}

.card--attention {
  --tone: var(--warn);
}

.card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.card__question {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.card__badge {
  flex: none;
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--tone);
  border-radius: 999px;
  color: var(--tone);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.card__headline {
  margin: 0.5rem 0 0;
  font-size: 1.05rem;
}

.card__detail {
  margin: 0.25rem 0 0.5rem;
  color: var(--muted);
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}
</style>
