import { describe, it, expect } from 'vitest'
import { ApiError, decodeResponse } from './response'
describe('Native and browser API responses', () => {
  it('accepts decoded native JSON', () => expect(decodeResponse(201, { session: { id: 'game' } })).toEqual({ session: { id: 'game' } }))
  it('parses JSON returned as a native string', () => expect(decodeResponse(201, '{"participantId":"player"}')).toEqual({ participantId: 'player' }))
  it.each(['', '<html>Not the API</html>', null, [], 'null'])('rejects a successful but invalid body: %s', body => {
    expect(() => decodeResponse(200, body)).toThrow('keine gültige API-Antwort')
  })
  it('retains terminal authentication status even with an empty error body', () => {
    try { decodeResponse(410, '') } catch (e) { expect(e).toBeInstanceOf(ApiError); expect((e as ApiError).terminal).toBe(true); return }
    throw new Error('Expected terminal error')
  })
  it('preserves backend error messages', () => expect(() => decodeResponse(409, '{"error":{"code":"NAME_TAKEN","message":"Name bereits vergeben."}}')).toThrow('Name bereits vergeben.'))
})
