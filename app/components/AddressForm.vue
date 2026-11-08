<script setup lang="ts">
import { ref } from 'vue'
import type { SampleOption } from '~/utils/analysis/samples'

defineProps<{
  samples: readonly SampleOption[]
  busy: boolean
  error: string | null
}>()

const emit = defineEmits<{ submit: [value: string]; pick: [option: SampleOption] }>()

const value = ref('')

function pick(option: SampleOption) {
  value.value = option.address
  emit('pick', option)
}
</script>

<template>
  <form class="form" novalidate @submit.prevent="emit('submit', value)">
    <label class="form__label" for="token-address">Token contract address</label>
    <div class="form__row">
      <input
        id="token-address"
        v-model="value"
        class="form__input"
        type="text"
        name="address"
        placeholder="0x…"
        autocomplete="off"
        spellcheck="false"
        :aria-invalid="error !== null"
        :aria-describedby="error ? 'token-address-error' : undefined"
      />
      <button class="form__submit" type="submit" :disabled="busy">
        {{ busy ? 'Checking…' : 'Check token' }}
      </button>
    </div>
    <p v-if="error" id="token-address-error" class="form__error" role="alert">
      {{ error }}
    </p>
    <div class="form__samples">
      <span class="form__hint">No address handy? Try</span>
      <button
        v-for="option in samples"
        :key="option.address"
        class="form__sample"
        type="button"
        :disabled="busy"
        @click="pick(option)"
      >
        {{ option.label }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.form__label {
  display: block;
  margin-bottom: 0.375rem;
  font-weight: 600;
}

.form__row {
  display: flex;
  gap: 0.5rem;
}

.form__input {
  flex: 1;
  min-width: 0;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
}

.form__submit,
.form__sample {
  padding: 0.625rem 1rem;
  border: 1px solid var(--accent);
  border-radius: 0.375rem;
  font: inherit;
  cursor: pointer;
}

.form__submit {
  background: var(--accent);
  color: var(--bg);
  font-weight: 600;
}

.form__sample {
  padding: 0.25rem 0.75rem;
  background: none;
  color: var(--accent);
}

.form button:disabled {
  opacity: 0.6;
  cursor: progress;
}

.form__error {
  margin: 0.5rem 0 0;
  color: var(--warn);
}

.form__samples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.form__hint {
  color: var(--muted);
  font-size: 0.9rem;
}

@media (max-width: 30rem) {
  .form__row {
    flex-direction: column;
  }
}
</style>
