// API contract snapshot; independent of the backend repository.
export type User = { id: string; email: string; isHoster: boolean }
export type AuthResponse = { user: User; csrfToken: string }
export type GameTemplate = { id: string; name: string; version: number; updated_at: string }

export type Coordinate = [number, number]
export type Polygon = { type: 'Polygon'; coordinates: Coordinate[][] }
export type Rules = {
  topUpStationEnabled: boolean; topUpStationPoint: Coordinate | null;
  durationSeconds: number; firstSilentPingSeconds: number; silentPingIntervalSeconds: number;
  runnersVisible: boolean; clusterEnabled: boolean; clusterDistanceMeters: number; clusterGraceSeconds: number;
  hunterLocationUses: number; regenerationUses: number; fakePingUses: number; speedhuntUses: number;
  catchConsumesSpeedhunt: boolean; speedhuntPings: number; speedhuntMaxGapSeconds: number; speedhuntTargetVisible: boolean;
}
export type TemplateDetail = GameTemplate & { rules: Rules; field: Polygon; created_at: string }

export type SessionPhase = 'preparing' | 'headstart' | 'hunt' | 'finished' | 'closed'
export type Position = { longitude: number; latitude: number; receivedAt: string; stale: boolean; kind: 'live' | 'silent' | 'speedhunt' | 'top_up' | 'hunter_snapshot'; publishedAt?: string; scheduledAt?: string; isFake?: boolean }
export type Participant = { id: string; name: string; role: 'hunter' | 'runner'; ready: boolean; state: string; position: Position | null; lastSilentPing: Position | null; lastPing: Position | null; bonuses: BonusState | null; sequence: number | null }
export type SessionEvent = { id: number; type: string; payload: Record<string, unknown>; created_at: string }
export type MovementTrail = { participantId: string; points: { longitude: number; latitude: number; receivedAt: string }[] }
export type GameWarning = { id: string; type: 'outside' | 'cluster'; participantIds: string[]; startedAt: string; deadline: string; warned: boolean }
export type GameSession = {
  warnings: GameWarning[];
  movementTrails?: MovementTrail[];
  id: string; name: string; code?: string; status: 'preparing' | 'running' | 'finished' | 'closed'; phase: SessionPhase;
  rules: Rules; field: Polygon; participants: Participant[]; events?: SessionEvent[]; me?: string;
  serverTime: string; startedAt: string | null; huntStartsAt: string | null; endsAt: string | null; nextSilentAt: string | null; result: string | null; closedAt: string | null; catches: CatchReport[]; speedhunt: Speedhunt | null; speedhuntsRemaining: number | null; hunterSnapshot: HunterSnapshot | null;
}
export type SessionSummary = { id: string; name: string; status: string; code: string; created_at: string }

export type HostSession = { id: string; name: string; code: string; status: 'preparing' | 'running' | 'finished' | 'closed'; ownerEmail: string; participantCount: number; hunterCount: number; runnerCount: number; created_at: string; finished_at: string | null; closed_at: string | null }
export type HostSessionList = { sessions: HostSession[]; total: number; page: number; statistics: Record<'preparing' | 'running' | 'finished' | 'closed', number> }

export type CatchReport = { id: string; hunterId: string; targetId: string; status: 'pending' | 'confirmed' | 'rejected' | 'expired'; adminConfirmed: boolean | null; runnerConfirmed: boolean | null; createdAt: string; resolvedAt: string | null }
export type Speedhunt = { pingCount: number; pingLimit: number; id: string; status: 'active' | 'completed' | 'expired' | 'target_caught' | 'game_finished'; targetId?: string; starterId?: string; remainingPings?: number; nextPingNumber?: number; pings?: { number: number; position: Position }[]; startedAt: string; expiresAt: string }
export type GameAction = { path: string; body: Record<string, unknown> }

export type BonusType = 'hunter_locations' | 'regeneration' | 'fake_ping'
export type BonusState = { topUp?: { enteredAt: string; lastSeenAt: string; refilledAt: string | null } | null; remaining: Record<BonusType, number>; pending: { type: BonusType; scheduledAt: string; position: { longitude: number; latitude: number } | null } | null; lastAction: { id: string; type: BonusType; status: 'pending' | 'consumed' | 'expired'; createdAt: string } | null }
export type HunterSnapshot = { id: string; capturedAt: string; positions: { participantId: string; name: string; position: Position | null }[] }
