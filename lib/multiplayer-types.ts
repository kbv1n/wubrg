// Multiplayer type definitions for AstralMagic
// These mirror the Colyseus Schema types for client-side use

export type GamePhase = "lobby" | "commander-select" | "playing" | "ended"

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
  odId: string
  name: string
  pid: number
  life: number
  poison: number
  colorIndex: number
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
  cmdDamage: Map<string, CommanderDamage>
}

export interface GameState {
  phase: GamePhase
  roomId: string
  hostId: string
  maxPlayers: number
  turn: number
  round: number
  players: Map<string, PlayerState>
  takenColors: number[]
  log: string[]
  playerOrder: string[]
}

// Client message types
export type ClientMessage = 
  | { type: "set_name"; name: string }
  | { type: "set_color"; colorIndex: number }
  | { type: "set_playmat"; url: string }
  | { type: "paste_deck"; deckText: string }
  | { type: "ready" }
  | { type: "unready" }
  | { type: "start_game" }
  | { type: "select_commander"; cardId: string }
  | { type: "move_card"; iid: string; toZone: string; x?: number; y?: number; index?: number }
  | { type: "tap_card"; iid: string }
  | { type: "untap_card"; iid: string }
  | { type: "flip_card"; iid: string }
  | { type: "add_counter"; iid: string; delta: number }
  | { type: "draw_cards"; count: number }
  | { type: "mill_cards"; count: number }
  | { type: "shuffle_library" }
  | { type: "change_life"; delta: number }
  | { type: "change_poison"; delta: number }
  | { type: "cmd_damage"; fromPid: number; delta: number }
  | { type: "pass_turn" }
  | { type: "untap_all" }
  | { type: "scry"; count: number }
  | { type: "reveal_top"; count: number }
  | { type: "create_token"; name: string; power: number; toughness: number }

// Room info from lobby listing
export interface RoomInfo {
  roomId: string
  clients: number
  maxClients: number
  metadata?: Record<string, unknown>
}
