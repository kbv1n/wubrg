// MTG Commander Game Types — single source of truth for both local and networked play

export interface CardData {
  name: string
  manaCost: string
  cmc: number
  typeLine: string
  oracle: string
  power: string | null
  tough: string | null
  loyalty: string | null
  rarity: string
  set: string
  isLegendary: boolean
  isCreature: boolean
  isPlaneswalker: boolean
  isLand: boolean
  mdfc?: boolean
  img: string | null
  imgBack?: string | null
  backName?: string | null
  backType?: string | null
  backPower?: string | null
  backTough?: string | null
}

export interface CardInstance extends CardData {
  iid: string
  tapped: boolean
  showBack: boolean
  faceDown: boolean
  summonSick: boolean
  counters: Record<string, number>
  x: number
  y: number
  z: number
}

export interface PlayerPalette {
  accent: string
  glow: string
  bg: string
  border: string
}

export interface Player {
  pid: number
  name: string
  pal: PlayerPalette
  life: number
  poison: number
  cmdDmg: Record<number, number>
  library: CardInstance[]
  hand: CardInstance[]
  battlefield: CardInstance[]
  graveyard: CardInstance[]
  exile: CardInstance[]
  command: CardInstance[]
  maxZ: number
  isDemo: boolean
  missed: number
  playmat: string
  playmatFit: string
}

export interface GameState {
  players: Player[]
  turn: number
  round: number
  log: string[]
}

export interface PlayerSetup {
  name: string
  deck: string
  playmat?: string
  playmatFit?: string
}

export type ZoneType = 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'command' | 'library'

export type ScreenType = 'setup' | 'loading' | 'commander-select' | 'game'

// Player Palettes - Flat vibrant colors
export const PALETTES: PlayerPalette[] = [
  { accent: '#3b82f6', glow: 'rgba(59, 130, 246, 0.3)', bg: '#1e2227', border: '#2d353f' },   // Cobalt (Universal Blue)
  { accent: '#10b981', glow: 'rgba(16, 185, 129, 0.3)', bg: '#1e2724', border: '#2d3f38' },   // Emerald Peak
  { accent: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.3)', bg: '#221e27', border: '#332d3f' },   // Modern Violet
  { accent: '#f43f5e', glow: 'rgba(244, 63, 94, 0.3)',  bg: '#271e20', border: '#3f2d31' },   // Crimson Frost
  { accent: '#06b6d4', glow: 'rgba(6, 182, 212, 0.3)',  bg: '#1e2627', border: '#2d3c3f' },   // Electric Cyan
  { accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)', bg: '#27231e', border: '#3f382d' },   // Amber Glow
  { accent: '#ec4899', glow: 'rgba(236, 72, 153, 0.3)', bg: '#271e23', border: '#3f2d37' },   // Magenta Neon
  { accent: '#64748b', glow: 'rgba(100, 116, 139, 0.3)', bg: '#1f2123', border: '#2f3337' },  // Slate Tech
];

// Counter Types
export const COUNTER_TYPES = [
  '+1/+1', '-1/-1', 'Loyalty', 'Charge', 'Poison', '+2/+2', 'Oil', 'Shield', 'Lore'
]

// Mana colors
export const MANA_COLORS: Record<string, string> = {
  W: '#f3f0e0',
  U: '#1a6bb5',
  B: '#26262a',
  R: '#d7360f',
  G: '#186a45',
  C: '#8b94a0',
  X: '#9b59b6'
}

// ─── Networked / Multiplayer Types ───────────────────────────────────────────
// These mirror the server's plain-JSON state and are used throughout the
// multiplayer components. The server sends CardState (minimal) and clients
// look up full CardData via lookupCard(cardId).

export type GamePhase = 'lobby' | 'commander-select' | 'playing' | 'ended'

/** Minimal card representation sent over the network. */
export interface CardState {
  iid: string
  cardId: string  // card name — looked up against Scryfall cache on the client
  x: number       // 0–100 percentage of battlefield width
  y: number       // 0–100 percentage of battlefield height
  tapped: boolean
  faceDown: boolean
  counters: number
  zone: string
}

export interface CommanderDamage {
  dealt: number
}

/** A player's full state as stored on the server and broadcast to clients. */
export interface PlayerState {
  odId: string        // socket session ID
  name: string
  pid: number         // join-order index
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
  cmdDamage: Map<string, CommanderDamage>
}

/** Full multiplayer room state broadcast from the server. */
export interface MPGameState {
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

export interface RoomInfo {
  roomId: string
  clients: number
  maxClients: number
  metadata?: Record<string, unknown>
}
