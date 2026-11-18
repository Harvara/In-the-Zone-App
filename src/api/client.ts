import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { decodeResponse } from './response'
export { ApiError } from './response'
export class GameApi {
  constructor(public server: string, private token?: string) {}
  async request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
    if (this.token) headers.Authorization = `Bearer ${this.token}`
    let status: number, data: any
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.request({ url: `${this.server}/api/v1${path}`, method: body ? 'POST' : 'GET', headers, data: body, connectTimeout: 10000, readTimeout: 15000, disableRedirects: true })
      status = response.status; data = response.data
    } else {
      // Browser development goes through Vite's same-origin proxy; no CORS exceptions on the backend.
      const response = await fetch(`/api/v1${path}`, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000), redirect: 'error' })
      status = response.status; data = await response.json().catch(() => null)
    }
    return decodeResponse<T>(status, data)
  }
}
