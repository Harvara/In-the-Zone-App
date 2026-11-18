<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { useGame } from './stores/game'
import { runtime, android, ios } from './platform/runtime'
import { validCode, insideField } from './domain/server'
import { phaseNames, remaining } from './domain/sessionTime'
import type { Coordinate, GameAction, Position } from './api/types'
import Icon from './components/Icon.vue'
import BrandLogo from './components/BrandLogo.vue'
import GameMap from './components/GameMap.vue'
import PlayerHistory from './components/PlayerHistory.vue'
import GameplayActions from './components/GameplayActions.vue'
import RunnerBonuses from './components/RunnerBonuses.vue'
import WarningPanel from './components/WarningPanel.vue'
const game = useGame()
const { session, me, credentials, initialized, error, notice, busy, failedAction, status, elapsed, lastSync } = game
const code = ref(''), name = ref(''), role = ref<'runner' | 'hunter'>('runner'), step = ref(1)
const setupOpen = ref(false), actionsOpen = ref(false), fakeMode = ref(false), fakePoint = ref<Coordinate | null>(null), snapshotVisible = ref(true)
const historyId = ref(''), historyPositions = ref<Position[]>([])
function showHistory(id: string, positions: Position[]) { historyId.value = id; historyPositions.value = positions }
const active = computed(() => session.value?.status === 'running' && me.value?.state === 'active')
let appListener: PluginListenerHandle | undefined, backListener: PluginListenerHandle | undefined
function closeFake() { fakeMode.value = false; fakePoint.value = null }
function chooseFake() { fakeMode.value = true; actionsOpen.value = false; fakePoint.value = null }
function point(value: Coordinate) {
  if (!session.value || !insideField(session.value.field.coordinates[0], value)) { error.value = 'Wähle eine Fake-Position innerhalb des Spielfelds.'; return }
  fakePoint.value = value; actionsOpen.value = true; error.value = ''
}
async function action(value: GameAction) {
  await game.act(value)
  if (!failedAction.value && !error.value) { closeFake(); if (value.path.includes('hunter-locations')) snapshotVisible.value = true }
}
async function settings(page: 'app' | 'battery' | 'location') { try { await runtime.settings(page) } catch (e) { error.value = e instanceof Error ? e.message : 'Einstellungen konnten nicht geöffnet werden.' } }
async function leave() {
  if (!window.confirm('Diesen Zugang auf dem Gerät entfernen? Dein Teilnehmer bleibt im Spiel. Ein erneuter Beitritt ist nur vor Spielstart möglich.')) return
  await game.reset('Zugang auf diesem Gerät entfernt.'); step.value = 1; code.value = ''; name.value = ''
}
watch(() => session.value?.id, (value, old) => { if (value !== old) { showHistory('', []); closeFake(); actionsOpen.value = false; snapshotVisible.value = true; if (!value) { setupOpen.value = false; step.value = 1; code.value = ''; name.value = '' } } })
watch(active, value => { if (!value) closeFake() })
onMounted(async () => {
  await game.init()
  if (Capacitor.isNativePlatform()) {
    appListener = await NativeApp.addListener('appStateChange', ({ isActive }) => { if (isActive) void game.refresh() })
    backListener = await NativeApp.addListener('backButton', () => { if (setupOpen.value) setupOpen.value = false; else if (actionsOpen.value) actionsOpen.value = false; else if (fakeMode.value) closeFake(); else if (!credentials.value && step.value === 2) step.value = 1; else void NativeApp.minimizeApp() })
  }
})
onBeforeUnmount(() => { game.dispose(); void appListener?.remove(); void backListener?.remove() })
</script>
<template>
<main v-if="!initialized" class="welcome"><p class="wordmark"><BrandLogo/></p><p>Zugang wird geladen …</p></main>
<main v-else-if="!credentials" class="welcome">
<header><a class="wordmark" href="#" aria-label="In the Zone – Startseite"><BrandLogo/></a><button class="ghost" @click="setupOpen = true">Setup</button></header>
<section class="join-content" :class="{ 'join-details': step === 2 }"><template v-if="step === 1"><p class="eyebrow">DIE STADT IST DEIN SPIELFELD</p><h1>Rausgehen.<br>Abtauchen.<br><em>Gefunden werden?</em></h1></template>
<p v-if="notice" role="status" class="notice">{{ notice }}</p><p v-if="error" role="alert" class="error">{{ error }}</p>
<form v-if="step === 1" @submit.prevent="step = 2"><label for="code">Spielcode</label><input id="code" v-model="code" class="code-input" placeholder="A1B2C3D4" maxlength="8" minlength="8" pattern="[A-Fa-f0-9]{8}" autocomplete="off" autocapitalize="characters" spellcheck="false" required><button :disabled="!validCode(code)" type="submit">Spiel beitreten <span>↗</span></button></form>
<form v-else @submit.prevent="game.join(code, name, role)"><button class="text-button" type="button" :disabled="busy" @click="step = 1">← Code {{ code.toUpperCase() }}</button><label for="name">Dein Name im Spiel</label><input id="name" v-model="name" maxlength="60" placeholder="Wie heißt du?" autocomplete="nickname" required :disabled="busy"><fieldset :disabled="busy"><legend>Auf welcher Seite spielst du?</legend><label class="role-choice" :class="{ chosen: role === 'runner' }"><input v-model="role" type="radio" value="runner"><span>↝ <strong>Gejagter</strong><small>Vorsprung nutzen. Unentdeckt bleiben.</small></span></label><label class="role-choice" :class="{ chosen: role === 'hunter' }"><input v-model="role" type="radio" value="hunter"><span>⌖ <strong>Jäger</strong><small>Pings lesen. Gemeinsam jagen.</small></span></label></fieldset><button :disabled="busy || !name.trim()" type="submit">{{ busy ? 'Beitritt läuft …' : 'Los geht’s' }}</button></form><p class="small muted">Kein Account nötig. Die Spielleitung gibt dir den Code.</p>
</section>
</main>
<main v-else class="play-screen">

<template v-if="session"><section class="time-bar"><div><small>{{ phaseNames[session.phase] }}</small><strong v-if="session.status === 'preparing'">Warte auf die Spielleitung</strong><strong v-else-if="session.phase === 'headstart'">Jagd in {{ remaining(session, session.huntStartsAt, elapsed) }}</strong><strong v-else-if="session.status === 'running'">Silent-Ping in {{ remaining(session, session.nextSilentAt, elapsed) }}</strong><strong v-else>{{ session.result === 'hunters_win' ? 'Die Jäger gewinnen' : session.result === 'runners_win' ? 'Die Gejagten gewinnen' : 'Spiel gestoppt' }}</strong></div><div v-if="session.status === 'running'"><small>Restzeit</small><strong>{{ remaining(session, session.endsAt, elapsed) }}</strong></div></section>
<p v-if="error" role="alert" class="error">{{ error }}</p><p v-if="failedAction" class="notice">Antwort unklar. Wiederholen prüft dieselbe Aktion ohne doppelten Verbrauch. <button :disabled="busy" @click="action(failedAction)">Erneut versuchen</button></p><p v-if="elapsed > 15" role="status" class="notice">Keine aktuelle Verbindung. Letzter Spielstand: {{ lastSync ? new Date(lastSync).toLocaleTimeString('de-DE') : 'noch keiner' }}.</p><p v-if="!status.location" class="notice">Standortfreigabe fehlt. <button @click="setupOpen = true">Setup öffnen</button></p><p v-else-if="status.error" role="status" class="notice">{{ status.error }}</p><p v-if="me?.state === 'eliminated'" class="notice">Du wurdest gefangen. Deine Standortübertragung ist beendet.</p>
<WarningPanel :session="session"/><p v-if="session.speedhunt?.status === 'active'" class="active-speedhunt" role="status">Aktiver Speedhunt, Ping {{ session.speedhunt.pingCount }}/{{ session.speedhunt.pingLimit }}</p><GameMap :key="session.id" :session="session" :snapshot-visible="snapshotVisible" :fake-mode="fakeMode" :fake-point="fakePoint" :history-id="historyId" :history-positions="historyPositions" @point="point"/>
<PlayerHistory v-if="me?.role === 'hunter'" :key="session.id" :participants="session.participants" :load="game.history" @history="showHistory"/>
<section v-if="session.status === 'preparing'" class="waiting-card"><p>Die Spielleitung startet, sobald alle bereit sind.</p><button :disabled="busy || !me?.position || !status.running" @click="action({ path: '/play/ready', body: { ready: !me?.ready } })">{{ me?.ready ? 'Bereit ✓ · Zurücknehmen' : 'Ich bin bereit' }}</button><small v-if="!me?.position">Warte auf den ersten GPS-Standort.</small></section><section v-if="fakeMode" class="fake-card"><p>Tippe im Spielfeld auf deine Fake-Ping-Position.</p><button class="ghost" @click="closeFake">Abbrechen</button></section>
<nav class="game-tools" aria-label="Spielaktionen"><button class="round-tool" :aria-label="me?.role === 'runner' ? 'Boni und Fangbestätigungen öffnen' : 'Jagdaktionen öffnen'" @click="actionsOpen = true"><Icon :name="me?.role === 'runner' ? 'heart' : 'target'"/><small>{{ me?.role === 'runner' ? 'Boni' : 'Jagd' }}</small></button><span class="connection-dot" :class="{ offline: elapsed > 15 }">{{ elapsed > 15 ? 'Offline' : 'Verbunden' }}</span><button v-if="session.hunterSnapshot" class="round-tool" aria-label="Jäger-Momentaufnahme ein- oder ausblenden" :aria-pressed="snapshotVisible" @click="snapshotVisible = !snapshotVisible"><Icon :name="snapshotVisible ? 'eye-off' : 'eye'"/><small>{{ snapshotVisible ? 'Ausblenden' : 'Anzeigen' }}</small></button></nav><p v-if="session.status === 'finished'" class="end-note">Das Ergebnis bleibt bis zum offiziellen Abschluss durch die Spielleitung sichtbar.</p>
</template><section v-else class="panel"><p v-if="error" role="alert">{{ error }}</p><p>Verbindung zum Spiel wird hergestellt …</p><button @click="game.refresh">Erneut laden</button></section>
</main>
<div v-if="actionsOpen && session" class="modal-backdrop" @click.self="actionsOpen = false"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="action-title"><header><h2 id="action-title">{{ me?.role === 'runner' ? 'Deine Möglichkeiten' : 'Die Jagd' }}</h2><button class="ghost" aria-label="Aktionen schließen" @click="actionsOpen = false">✕</button></header><p v-if="error" role="alert" class="error">{{ error }}</p><p v-if="notice" role="status" class="notice">{{ notice }}</p><button v-if="failedAction" :disabled="busy" @click="action(failedAction)">Letzte Aktion sicher wiederholen</button><RunnerBonuses :session="session" :busy="busy || !!failedAction" :fake-mode="fakeMode" :fake-point="fakePoint" @choose-fake="chooseFake" @cancel-fake="closeFake" @action="action"/><GameplayActions :session="session" :busy="busy || !!failedAction" :elapsed="elapsed" @action="action"/></section></div>
<div v-if="setupOpen" class="modal-backdrop" @click.self="setupOpen = false"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="setup-title"><header><h2 id="setup-title">Bereit für draußen</h2><button class="ghost" aria-label="Setup schließen" @click="setupOpen = false">✕</button></header><p class="muted">Während deiner Teilnahme überträgt In the Zone deinen echten Standort an die Spielleitung. Die Übertragung endet bei Ausscheiden oder Spielende.</p><ul class="setup-checks"><li>{{ status.location ? '✓' : '○' }} Standort freigegeben</li><li>{{ status.notifications ? '✓' : '○' }} Spielbenachrichtigungen erlaubt</li><li v-if="android">{{ status.batteryExempt ? '✓' : '○' }} Akkuoptimierung ausgenommen</li><li>{{ status.running ? '✓ Ortung aktiv' : '○ Ortung inaktiv' }}</li></ul><button @click="game.access">Standort und Benachrichtigungen freigeben</button><template v-if="Capacitor.isNativePlatform()"><button class="secondary" @click="settings('app')">App-Einstellungen öffnen</button><button v-if="android" class="secondary" @click="settings('battery')">Akkuoptimierung einstellen</button><button v-if="android" class="secondary" @click="settings('location')">GPS-Einstellungen öffnen</button></template><p v-if="android" class="small muted">Die laufende Spielbenachrichtigung hält den Android-Standortdienst aktiv. Zusätzliche Energiesparregeln deines Herstellers können eingreifen. Nach „Stopp erzwingen“ musst du die App erneut öffnen.</p><p v-if="ios" class="notice">iOS-Vorschau: Ortung bisher nur bei geöffneter App. Hintergrundortung und Benachrichtigungen folgen im iOS-Ausbau.</p><p v-if="!Capacitor.isNativePlatform()" class="notice">Browservorschau: kein zuverlässiger Hintergrundbetrieb.</p><p v-if="error" role="alert" class="error">{{ error }}</p><button v-if="credentials" class="danger-button" @click="leave">Zugang auf diesem Gerät entfernen</button></section></div>
</template>
