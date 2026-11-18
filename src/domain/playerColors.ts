import type { Participant } from '../api/types'
// The same identity ordering is used in every role view, independent of visible positions.
const palette = ['#3521d4', '#b000bc', '#005e99', '#c44b00', '#6d169b', '#006b73', '#b20041', '#253f7b', '#744400', '#3a5500', '#8c174a', '#004952']
export function playerColors(participants: Pick<Participant, 'id'>[]): Record<string, string> {
  return Object.fromEntries([...participants].sort((a, b) => a.id.localeCompare(b.id)).map((p, i) => [p.id, palette[i] || `hsl(${((i * 137.508) % 360).toFixed(3)} 88% 32%)`]))
}
