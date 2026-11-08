<script setup lang="ts">
import { ref, useId } from 'vue'

defineProps<{ text: string }>()
const emit = defineEmits<{ open: [] }>()

const isOpen = ref(false)
const panelId = useId()

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) emit('open')
}
</script>

<template>
  <div class="explain">
    <button
      type="button"
      class="explain__toggle"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      @click="toggle"
    >
      Why it matters
    </button>
    <p v-show="isOpen" :id="panelId" class="explain__text">{{ text }}</p>
  </div>
</template>

<style scoped>
.explain__toggle {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-size: 0.875rem;
  text-decoration: underline;
  cursor: pointer;
}

.explain__text {
  margin: 0.5rem 0 0;
  color: var(--muted);
  font-size: 0.9rem;
}

@media print {
  .explain__toggle {
    display: none;
  }

  .explain__text {
    display: block !important;
  }
}
</style>
