<script setup lang="ts">
import ZoneMark from './ZoneMark.vue'
</script>

<template>
  <span class="brand-logo"><ZoneMark decorative/><span class="brand-name">IN THE ZONE</span></span>
</template>

<style scoped>
.brand-logo { display: inline-flex; align-items: center; gap: 10px; white-space: nowrap; vertical-align: middle; font: inherit; color: inherit; margin: 0; }
.brand-logo .zone-mark { color: #fff; font-size: 28px; margin: 0; }
.brand-logo .brand-name { color: inherit; font: inherit; margin: 0; }
@media (max-width: 360px) { .brand-logo { gap: 8px; letter-spacing: 1.5px; } }
</style>
