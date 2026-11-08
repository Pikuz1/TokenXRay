<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTracker } from '~/composables/useTracker'
import { CHECK_COPY } from '~/content/check-copy'
import { presentCheck } from '~/content/present'
import type { AnyCheckResult } from '~/types/analysis'
import ConcentrationBar from './ConcentrationBar.vue'
import PowerCard from './PowerCard.vue'

const props = defineProps<{ result: AnyCheckResult }>()

const { track } = useTracker()
const copy = computed(() => CHECK_COPY[props.result.id])
const presentation = computed(() => presentCheck(props.result))
const bar = computed(() => {
  const { result } = props
  return result.id === 'concentration' && result.top1 !== null && result.top10 !== null
    ? { top1: result.top1, top10: result.top10 }
    : null
})

onMounted(() => {
  if (props.result.status === 'unknown')
    track('check_unknown_shown', { check: props.result.id })
})
</script>

<template>
  <PowerCard
    :question="copy.question"
    :why-it-matters="copy.whyItMatters"
    v-bind="presentation"
    @explain="track('explain_opened', { check: result.id })"
  >
    <ConcentrationBar v-if="bar" :top1="bar.top1" :top10="bar.top10" />
  </PowerCard>
</template>
