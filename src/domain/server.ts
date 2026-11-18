export function normalizeServer(value: string): string {
  const url = new URL(value)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) throw new Error('Bitte die Serveradresse ohne Pfad oder Zugangsdaten eingeben.')
  const local = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(url.hostname)
  if (url.protocol !== 'https:' && !local) throw new Error('Öffentliche Server benötigen HTTPS. HTTP ist nur im lokalen Netz erlaubt.')
  return url.origin
}
export function validCode(code: string) { return /^[a-f\d]{8}$/i.test(code.trim()) }
export function insideField(ring: [number, number][], [x, y]: [number, number]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i], [bx, by] = ring[j]
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax)
    if (Math.abs(cross) < 1e-12 && x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by)) return true
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside
  }
  return inside
}

export const SERVER_URL = 'https://in-the-zone.de'

export function initialServer(_saved?: string | null, _configured?: string, _release?: boolean): string {
  return SERVER_URL
}
