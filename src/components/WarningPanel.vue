<script setup lang="ts">
import type { GameSession } from '../api/types'
defineProps<{ session: GameSession }>()
function names(session: GameSession, ids: string[]) { return ids.map(id => session.participants.find(p => p.id === id)?.name || 'Teilnehmer').join(' und ') }
</script>
<template><section v-if="session.warnings?.length" class="panel warning-panel" aria-live="polite"><h2>Spielhinweise</h2><p v-for="warning in session.warnings" :key="warning.id" :data-warning-type="warning.type"><strong>{{ names(session, warning.participantIds) }}:</strong> <template v-if="warning.type === 'outside'">Außerhalb des Spielfelds. Bitte ins Spielfeld zurückkehren.</template><template v-else-if="warning.warned">Zu lange zu nah beieinander. Bitte Abstand halten.</template><template v-else>Zu nah beieinander. Bitte bis {{ new Date(warning.deadline).toLocaleTimeString('de-DE') }} Abstand halten.</template></p><small>Hinweise werden protokolliert. Es gibt keine automatische Strafe. Bei fehlenden aktuellen Standortmeldungen wird die Prüfung unterbrochen.</small></section></template>
