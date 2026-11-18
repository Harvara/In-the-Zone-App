<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Participant, Position } from '../api/types'

const props = defineProps<{ participants: Participant[]; load: (id: string) => Promise<Position[]> }>()
const emit = defineEmits<{ history: [id: string, positions: Position[]] }>()
const runners = computed(() => props.participants.filter(p => p.role === 'runner'))
const selected = ref(''), error = ref(''), loading = ref(false), count = ref(0)
watch(runners, players => { if (selected.value && !players.some(p => p.id === selected.value)) selected.value = '' })
let generation = 0, timer: ReturnType<typeof setTimeout> | undefined
watch(selected, () => { generation++; clearTimeout(timer); count.value = 0; error.value = ''; emit('history', selected.value, []); void refresh(generation) })
async function refresh(request: number) {
  const id = selected.value
  if (!id) { loading.value = false; return }
  loading.value = true
  try {
    const positions = await props.load(id)
    if (request !== generation) return
    count.value = positions.length; error.value = ''; emit('history', id, positions)
  } catch (e) {
    if (request === generation) error.value = e instanceof Error ? e.message : 'Verlauf konnte nicht geladen werden.'
  } finally {
    if (request === generation) { loading.value = false; timer = setTimeout(() => { void refresh(request) }, 3000) }
  }
}
onBeforeUnmount(() => { generation++; clearTimeout(timer) })
</script>
<template>
  <section class="history-picker" aria-label="Spieler für den Standortverlauf auswählen">
    <label for="player-history">Standortverlauf</label><select id="player-history" v-model="selected"><option value="">Normale Kartenansicht</option><option v-for="p in runners" :key="p.id" :value="p.id">{{ p.name }} · Gejagter</option></select>
    <button v-if="selected" class="ghost" @click="selected = ''">Verlauf abwählen</button>
    <p v-if="selected" class="small muted" role="status">{{ loading && !count ? 'Verlauf wird geladen …' : `${count} veröffentlichte Pings · Linien verbinden die gemeldeten Positionen` }}</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </section>
</template>
<style scoped>
.history-picker { display: grid; gap: .4rem; padding: .8rem 1rem; background: var(--zone-surface); }
.history-picker label { font-weight: 700; }
.history-picker select { width: 100%; min-height: 44px; padding: .6rem; border: 1px solid var(--zone-border); border-radius: .6rem; background: var(--zone-input); color: var(--zone-text); font: inherit; }
.history-picker p { margin: 0; }
</style>
