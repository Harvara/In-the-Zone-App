export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
  get terminal() { return this.status === 401 || this.status === 410 || this.code === 'SESSION_NOT_FOUND' }
}
export function decodeResponse<T>(status: number, payload: unknown): T {
  let data = payload
  if (typeof data === 'string') {
    try { data = JSON.parse(data) } catch { data = null }
  }
  const object = data !== null && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, any> : null
  if (status < 200 || status >= 300) throw new ApiError(status, object?.error?.code || 'REQUEST_FAILED', object?.error?.message || 'Server gerade nicht erreichbar.')
  if (!object) throw new ApiError(502, 'INVALID_API_RESPONSE', 'Der Server liefert keine gültige API-Antwort. Bitte Serveradresse und Serverkonfiguration prüfen.')
  return object as T
}
