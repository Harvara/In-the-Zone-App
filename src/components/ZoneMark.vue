<script setup lang="ts">
import artwork from '../assets/zone-mark.svg?raw'
defineProps<{ decorative?: boolean }>()
</script>

<template>
  <!-- Lokaler SVG-Snapshot der freigegebenen Marke; keine Nutzerdaten. -->
  <span class="zone-mark" :aria-hidden="decorative ? 'true' : undefined" v-html="artwork"></span>
</template>

<style scoped>
.zone-mark { display: inline-block; width: .9em; height: 1em; flex-shrink: 0; line-height: 1; vertical-align: -.12em; }
.zone-mark :deep(svg) { display: block; width: 100%; height: 100%; }
</style>
