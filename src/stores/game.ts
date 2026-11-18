import { computed, ref } from 'vue'
import { GameApi, ApiError } from '../api/client'
import type { GameAction, GameSession, Position } from '../api/types'
import { runtime, type Credentials, type RuntimeStatus } from '../platform/runtime'
import { normalizeServer, initialServer } from '../domain/server'
export function useGame() {
  const session = ref<GameSession>(), credentials = ref<Credentials>()
  const error = ref(''), notice = ref(''), busy = ref(false), initialized = ref(false)
  const failedAction = ref<GameAction>()
  const status = ref<RuntimeStatus>({ location: false, notifications: false, batteryExempt: false, running: false })
  const server = ref(initialServer())
  const me = computed(() => session.value?.participants.find(p => p.id === session.value?.me))
  const lastSync = ref(0), elapsed = ref(0)
  let stopped = false, timer: ReturnType<typeof setTimeout>, clock: ReturnType<typeof setInterval>
  let starting = false
  const api = () => new GameApi(credentials.value?.server || normalizeServer(server.value), credentials.value?.token)
  async function reset(message = '') {
    await runtime.clear()
    credentials.value = undefined; session.value = undefined; failedAction.value = undefined; error.value = ''; notice.value = message
  }
  async function handle(e: unknown) {
    if (e instanceof ApiError && e.terminal && credentials.value) { await reset('Das Spiel wurde offiziell beendet oder dein Zugang ist nicht mehr gültig.'); return }
    error.value = e instanceof Error ? e.message : 'Verbindung fehlgeschlagen.'
  }
  async function apply(state: GameSession) {
    if (state.status === 'closed') { await reset('Das Spiel wurde offiziell beendet.'); return }
    session.value = state; lastSync.value = Date.now(); elapsed.value = 0
    if (state.status === 'finished' || me.value?.state === 'eliminated') { await runtime.stop(); return }
    if (starting) return
    starting = true
    try {
      status.value = await runtime.status()
      if (status.value.location && !status.value.running) {
        await runtime.start(async (longitude, latitude, accuracy) => {
          if (!credentials.value || !session.value || session.value.status === 'finished' || me.value?.state !== 'active') return
          const sequence = Math.max(Date.now(), (me.value?.sequence || 0) + 1)
          try { await api().request('/play/positions', { longitude, latitude, accuracy, sequence }) } catch (e) { await handle(e) }
        })
        status.value = await runtime.status()
      }
    } catch (e) { error.value = e instanceof Error ? e.message : 'Ortung konnte nicht starten.' }
    finally { starting = false }
  }
  async function refresh() {
    if (!credentials.value) return
    const current = credentials.value
    try {
      const result = await api().request<{ session: GameSession }>('/play/state')
      if (credentials.value !== current) return
      error.value = ''; await apply(result.session)
      status.value = await runtime.status()
    } catch (e) { if (credentials.value === current) await handle(e) }
  }
  async function history(id: string): Promise<Position[]> {
    try { return (await api().request<{ positions: Position[] }>(`/play/history/${encodeURIComponent(id)}`)).positions }
    catch (e) { await handle(e); throw e }
  }
  async function join(code: string, name: string, role: 'runner' | 'hunter') {
    if (busy.value || credentials.value) return
    busy.value = true; error.value = ''; notice.value = ''
    try {
      const address = normalizeServer(server.value)
      const result = await new GameApi(address).request<{ token: string; participantId: string; session: GameSession }>('/join', { code: code.trim().toUpperCase(), name: name.trim(), role })
      if (!result.session?.id || !result.token || !result.participantId) throw new ApiError(502, 'INVALID_JOIN_RESPONSE', 'Die Serverantwort enthält keinen gültigen Spielzugang. Bitte versuche es erneut.')
      const access = { server: address, token: result.token, participantId: result.participantId, sessionId: result.session.id }
      await runtime.save(access); credentials.value = access
      await apply(result.session)
    } catch (e) { await handle(e) } finally { busy.value = false }
  }
  async function act(action: GameAction) {
    if (busy.value || !credentials.value) return
    busy.value = true; error.value = ''
    try {
      await api().request(action.path, action.body); failedAction.value = undefined
      notice.value = 'Aktion übernommen.'; await refresh()
    } catch (e) {
      if (!(e instanceof ApiError) || e.status >= 500) failedAction.value = action
      else failedAction.value = undefined
      await handle(e)
    } finally { busy.value = false }
  }
  async function access() {
    try { status.value = await runtime.requestAccess(); await refresh() } catch (e) { await handle(e) }
  }
  async function poll() { if (stopped) return; await refresh(); if (!stopped) timer = setTimeout(poll, 3000) }
  async function init() {
    try {
      const saved = await runtime.load()
      if (saved && normalizeServer(saved.server) !== server.value) {
        await runtime.clear()
        notice.value = 'Bitte tritt deinem Spiel erneut bei.'
      } else credentials.value = saved
      status.value = await runtime.status()
    } catch (e) { await handle(e) }
    initialized.value = true
    clock = setInterval(() => { elapsed.value = lastSync.value ? (Date.now() - lastSync.value) / 1000 : 0 }, 250)
    void poll()
  }
  function dispose() { stopped = true; clearTimeout(timer); clearInterval(clock) }
  return { session, me, credentials, error, notice, busy, initialized, failedAction, status, server, elapsed, lastSync, init, refresh, history, join, act, access, reset, dispose }
}
