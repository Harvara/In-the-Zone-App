import type { GameSession } from '../api/types'
export const phaseNames = { preparing: 'Vorbereitung', headstart: 'Vorsprung für Gejagte', hunt: 'Jagd läuft', finished: 'Spiel beendet – Abschluss offen', closed: 'Offiziell beendet' }
export function remaining(session: GameSession, timestamp: string | null, elapsedSincePoll: number): string {
  if (!timestamp) return '–'
  const seconds = Math.max(0, Math.ceil((Date.parse(timestamp) - Date.parse(session.serverTime)) / 1000 - elapsedSincePoll))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
