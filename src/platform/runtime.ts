import { Capacitor, registerPlugin } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
export type Credentials = { server: string; token: string; participantId: string; sessionId: string }
export type RuntimeStatus = { location: boolean; notifications: boolean; batteryExempt: boolean; running: boolean; lastPositionAt?: number; lastSyncAt?: number; error?: string }
interface NativeRuntime {
  load(): Promise<{ credentials?: Credentials }>
  save(options: Credentials): Promise<void>
  clear(): Promise<void>
  status(): Promise<RuntimeStatus>
  requestAccess(): Promise<RuntimeStatus>
  openSettings(options: { page: 'app' | 'battery' | 'location' }): Promise<void>
  start(): Promise<void>
  stop(): Promise<void>
}
const native = registerPlugin<NativeRuntime>('GameRuntime')
export const android = Capacitor.getPlatform() === 'android'
export const ios = Capacitor.getPlatform() === 'ios'
let watchId: string | undefined
let sending = false
export const runtime = {
  async load(): Promise<Credentials | undefined> {
    if (Capacitor.isNativePlatform()) return (await native.load()).credentials
    try { return JSON.parse(sessionStorage.getItem('manhunt-player') || 'null') || undefined } catch { return undefined }
  },
  async save(credentials: Credentials) {
    if (Capacitor.isNativePlatform()) await native.save(credentials)
    else sessionStorage.setItem('manhunt-player', JSON.stringify(credentials))
  },
  async clear() {
    await this.stop()
    if (Capacitor.isNativePlatform()) await native.clear()
    else sessionStorage.removeItem('manhunt-player')
  },
  async status(): Promise<RuntimeStatus> {
    if (android) return native.status()
    const permission = await Geolocation.checkPermissions().catch(() => null)
    return { location: permission?.location === 'granted', notifications: false, batteryExempt: false, running: !!watchId }
  },
  async requestAccess() {
    if (android) return native.requestAccess()
    if (Capacitor.isNativePlatform()) await Geolocation.requestPermissions()
    else await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 })
    return this.status()
  },
  async settings(page: 'app' | 'battery' | 'location') {
    if (Capacitor.isNativePlatform()) await native.openSettings({ page })
  },
  async start(send: (longitude: number, latitude: number, accuracy: number) => Promise<void>) {
    if (android) { await native.start(); return }
    if (watchId) return
    watchId = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }, async (position, error) => {
      if (!position || error || sending || Date.now() - position.timestamp > 15000) return
      sending = true
      try { await send(position.coords.longitude, position.coords.latitude, position.coords.accuracy) } finally { sending = false }
    })
  },
  async stop() {
    if (android) await native.stop()
    if (watchId) { await Geolocation.clearWatch({ id: watchId }); watchId = undefined }
  },
}
