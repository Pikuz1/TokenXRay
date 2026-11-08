<script setup lang="ts">
defineProps<{ question: string; message: string }>()
</script>

<template>
  <article class="pending" aria-busy="true">
    <h3 class="pending__question">{{ question }}</h3>
    <p class="pending__message" role="status">{{ message }}</p>
  </article>
</template>

<style scoped>
.pending {
  padding: 1rem 1.25rem;
  border: 1px dashed var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
}

.pending__question {
  margin: 0;
  font-size: 0.95rem;
}

.pending__message {
  margin: 0.5rem 0 0;
  color: var(--muted);
  font-size: 0.9rem;
}
</style>
