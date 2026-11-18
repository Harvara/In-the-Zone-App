import { describe, it, expect } from 'vitest'
import { normalizeServer, initialServer, validCode, insideField } from './server'
import { remaining } from './sessionTime'
import type { GameSession } from '../api/types'
describe('Server and game boundary validation', () => {
  it('uses the fixed service origin regardless of saved settings or build mode', () => {
    expect(initialServer('http://10.0.2.2:8080', 'https://game.example.org', true)).toBe('https://in-the-zone.de')
    expect(initialServer('https://other.example.org', 'https://game.example.org', true)).toBe('https://in-the-zone.de')
    expect(initialServer('broken', undefined, false)).toBe('https://in-the-zone.de')
  })
  it.each(['https://game.example.org', 'http://192.168.1.2:8080', 'http://10.0.2.2:8080', 'http://localhost:8080'])('allows %s', server => expect(normalizeServer(server + '/')).toBe(server))
  it.each(['http://game.example.org', 'https://user:secret@example.org', 'https://example.org/api', 'javascript:alert(1)', 'https://example.org?token=secret', 'https://example.org#secret'])('rejects %s', server => expect(() => normalizeServer(server)).toThrow())
  it('validates the join code', () => { expect(validCode(' ab12cd34 ')).toBe(true); expect(validCode('1234567Z')).toBe(false) })
  it('checks fake-ping points including polygon edges', () => {
    const ring: [number, number][] = [[0, 0], [4, 0], [4, 4], [2, 2], [0, 4], [0, 0]]
    expect(insideField(ring, [1, 1])).toBe(true); expect(insideField(ring, [2, 3])).toBe(false); expect(insideField(ring, [0, 2])).toBe(true)
  })
  it('uses server time and clamps expired countdowns', () => {
    const session = { serverTime: '2026-10-30T12:00:00Z' } as GameSession
    expect(remaining(session, '2026-10-30T12:01:00Z', 5)).toBe('0:55')
    expect(remaining(session, '2026-10-30T12:01:00Z', 70)).toBe('0:00')
  })
})
