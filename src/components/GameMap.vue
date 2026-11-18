<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Coordinate, GameSession, Position } from '../api/types'
import Icon from './Icon.vue'
import { playerColors } from '../domain/playerColors'
const props = defineProps<{ session: GameSession; snapshotVisible: boolean; fakeMode: boolean; fakePoint: Coordinate | null; historyId?: string; historyPositions?: Position[] }>()
const emit = defineEmits<{ point: [point: Coordinate] }>()
const container = ref<HTMLDivElement>(), tilesFailed = ref(false)
let map: L.Map | undefined, markers: L.LayerGroup, observer: ResizeObserver
function draw() {
  if (!map) return
  markers.clearLayers()
  const station = props.session.rules.topUpStationEnabled && props.session.rules.topUpStationPoint
  if (station) {
    L.circle([station[1], station[0]], { radius: 25, color: '#b45309', fillColor: '#fbbf24', fillOpacity: .3, className: 'top-up-station-radius' }).bindTooltip('Top Up Station · 25 m · 5 Minuten').addTo(markers)
    L.marker([station[1], station[0]], { icon: L.divIcon({ className: 'top-up-station-marker', html: '＋', iconSize: [28, 28], iconAnchor: [14, 14] }) }).bindTooltip('Top Up Station').addTo(markers)
  }
  const colors = playerColors(props.session.participants)
  if (props.historyId) {
    const player = props.session.participants.find(p => p.id === props.historyId)
    const points = props.historyPositions || []
    // Connect published pings even across long intervals; split only live GPS gaps.
    let segment: L.LatLngTuple[] = []
    const line = () => { if (segment.length > 1) L.polyline(segment, { color: colors[props.historyId!], weight: 3, opacity: .8, interactive: false, className: 'history-trail' }).addTo(markers) }
    points.forEach((position, index) => {
      if (index && position.kind === 'live' && points[index - 1].kind === 'live' && Date.parse(position.receivedAt) - Date.parse(points[index - 1].receivedAt) > 30000) { line(); segment = [] }
      segment.push([position.latitude, position.longitude])
      const label = document.createElement('span')
      label.textContent = `${player?.name || ''} · ${position.kind === 'live' ? 'Standort' : position.kind === 'top_up' ? 'Top Up Ping' : position.kind === 'speedhunt' ? 'Speedhunt-Ping' : 'Silent-Ping'} · ${new Date(position.publishedAt || position.receivedAt).toLocaleTimeString('de-DE')}`
      L.circleMarker([position.latitude, position.longitude], { radius: 6, color: '#0b121b', weight: 2, fillColor: colors[props.historyId!], fillOpacity: .8, className: 'history-position-marker' }).bindTooltip(label).addTo(markers)
    })
    line()
  }
  for (const p of props.session.participants) {
    if (props.historyId && p.id !== props.historyId && p.id !== props.session.me) continue
    if (!p.position) continue
    const position = p.position, published = position.kind === 'silent' || position.kind === 'speedhunt' || position.kind === 'top_up'
    const label = document.createElement('span')
    label.textContent = `${p.name}${p.id === props.session.me ? ' · Du' : ''}${published ? ` · ${position.kind === 'top_up' ? 'Top Up' : position.kind === 'silent' ? 'Silent' : 'Speedhunt'}-Ping · ${new Date(position.publishedAt || position.receivedAt).toLocaleTimeString('de-DE')}` : ''}${p.state === 'eliminated' ? ' · Gefangen' : ''}`
    L.circleMarker([position.latitude, position.longitude], { radius: p.id === props.session.me ? 10 : 8, color: '#0b121b', weight: 3, fillColor: colors[p.id], fillOpacity: p.state === 'eliminated' ? .3 : .95, className: `player-marker ${published ? 'published-ping' : 'live-position'}` }).bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -9], className: `player-label player-label-${p.role}` }).addTo(markers)
  }
  const own = props.session.participants.find(p => p.id === props.session.me)
  const pending = own?.bonuses?.pending
  const fake = pending?.type === 'fake_ping' ? pending.position : own?.lastPing?.isFake ? own.lastPing : null
  if (fake) {
    const label = document.createElement('span')
    label.textContent = pending?.type === 'fake_ping' ? `Dein Fake-Ping · vorgemerkt für ${new Date(pending.scheduledAt).toLocaleTimeString('de-DE')}` : 'Dein veröffentlichter Fake-Ping'
    L.circleMarker([fake.latitude, fake.longitude], { radius: 14, color: colors[props.session.me!], weight: 3, dashArray: '6 4', fill: false, className: 'own-fake-ping-marker' }).bindTooltip(label, { permanent: true, direction: 'bottom' }).addTo(markers)
  }
  if (!props.historyId && props.snapshotVisible && props.session.hunterSnapshot) for (const hunter of props.session.hunterSnapshot.positions) {
    if (!hunter.position) continue
    const label = document.createElement('span'); label.textContent = `${hunter.name} · Momentaufnahme ${new Date(props.session.hunterSnapshot.capturedAt).toLocaleTimeString('de-DE')}`
    L.circleMarker([hunter.position.latitude, hunter.position.longitude], { radius: 10, color: '#0b121b', weight: 3, dashArray: '3 3', fillColor: colors[hunter.participantId], fillOpacity: .85, className: 'hunter-snapshot-marker' }).bindTooltip(label, { permanent: true, direction: 'top', className: 'player-label player-label-hunter' }).addTo(markers)
  }
  if (props.fakePoint) L.circleMarker([props.fakePoint[1], props.fakePoint[0]], { radius: 12, color: '#562db8', weight: 4, fillColor: '#bba5ff', fillOpacity: .8, className: 'fake-draft-marker' }).bindTooltip('Gewählter Fake-Ping').addTo(markers)
}
function locate() {
  const p = props.session.participants.find(p => p.id === props.session.me)?.position
  if (p) map?.setView([p.latitude, p.longitude], 16)
}
onMounted(() => {
  map = L.map(container.value!, { zoomControl: false }).setView([52.52, 13.405], 13)
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  L.tileLayer(import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: import.meta.env.VITE_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).on('tileerror', () => { tilesFailed.value = true }).addTo(map)
  const field = L.polygon(props.session.field.coordinates[0].map(([x, y]) => [y, x] as L.LatLngTuple), { color: '#427fae', fillColor: '#7cb8e8', fillOpacity: .24, weight: 3, interactive: false }).addTo(map)
  map.fitBounds(field.getBounds(), { padding: [35, 35], maxZoom: 16, animate: false })
  markers = L.layerGroup().addTo(map)
  map.on('click', e => { if (props.fakeMode) emit('point', [e.latlng.lng, e.latlng.lat]) })
  observer = new ResizeObserver(() => map?.invalidateSize()); observer.observe(container.value!); draw()
})
watch(() => [props.session.participants, props.session.hunterSnapshot, props.snapshotVisible, props.fakePoint, props.historyId, props.historyPositions], draw, { deep: true })
onBeforeUnmount(() => { observer?.disconnect(); map?.remove() })
</script>
<template><div class="game-map"><div ref="container" class="map-canvas" data-testid="game-map"></div><button class="locate-button" aria-label="Auf meinen Standort zentrieren" @click="locate"><Icon name="target"/></button><p v-if="tilesFailed" class="tile-warning">Kartenkacheln nicht erreichbar. Spielfeld und Pings bleiben sichtbar.</p></div></template>
