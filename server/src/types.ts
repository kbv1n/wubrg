// Shared plain-TypeScript types for AstralMagic game state.
// No Colyseus decorators — just plain interfaces that serialize to JSON cleanly.

export interface CardState {
  iid: string
  cardId: string
  x: number
  y: number
  tapped: boolean
  faceDown: boolean
  counters: number
  zone: string
}

export interface CommanderDamage {
  dealt: number
}

export interface PlayerState {
  odId: string        // socket session ID
  name: string
  pid: number         // join order index
  life: number
  poison: number
  colorIndex: number  // -1 = none selected
  playmatUrl: string
  ready: boolean
  connected: boolean
  deckText: string
  battlefield: CardState[]
  hand: CardState[]
  library: CardState[]
  graveyard: CardState[]
  exile: CardState[]
  commandZone: CardState[]
  cmdDamage: Record<string, CommanderDamage> // keyed by opposing player's socket ID
}

export type GamePhase = "lobby" | "playing" | "ended"

export interface GameState {
  phase: GamePhase
  roomId: string
  hostId: string
  maxPlayers: number
  turn: number          // index into playerOrder
  round: number
  players: Record<string, PlayerState>  // keyed by socket ID
  takenColors: number[]
  log: string[]
  playerOrder: string[] // socket IDs in turn order
}

// Client → Server message payload shapes (type is the socket event name)
export interface MoveCardPayload   { iid: string; toZone: string; x?: number; y?: number; index?: number }
export interface TapCardPayload    { iid: string }
export interface FlipCardPayload   { iid: string }
export interface CounterPayload    { iid: string; delta: number }
export interface DrawPayload       { count: number }
export interface MillPayload       { count: number }
export interface LifePayload       { delta: number }
export interface PoisonPayload     { delta: number }
export interface SetNamePayload    { name: string }
export interface SetColorPayload   { colorIndex: number }
export interface SetPlaymatPayload { url: string }
export interface PasteDeckPayload  { deckText: string }
export interface CreateRoomPayload { name: string; maxPlayers: number }
export interface JoinRoomPayload   { roomId: string; name: string }
