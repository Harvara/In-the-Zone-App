<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ name: 'heart' | 'eye' | 'eye-off' | 'target' | 'settings' }>()
const path = computed(() => ({
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z',
  'eye-off': 'M3 3l18 18 M10 5.2A12 12 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.2 4 M6.2 6.2A20 20 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.3-1.3 M9.9 9.9a3 3 0 0 0 4.2 4.2',
  target: 'M12 2v4 M12 18v4 M2 12h4 M18 12h4 M19 12a7 7 0 1 1-14 0 7 7 0 1 1 14 0 M14 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0',
  settings: 'm9 3-.5 2-2 1-2-.5-2 3 1.5 1.5v3L2.5 15l2 3 2-.5 2 1L9 21h6l.5-2.5 2-1 2 .5 2-3-1.5-2v-3L21.5 9l-2-3-2 .5-2-1L15 3Z M15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0'
})[props.name])
</script>
<template><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path :d="path"/></svg></template>
