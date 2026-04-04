// MTG Commander Game Types

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

// Player Palettes - Muted, desaturated tones
export const PALETTES: PlayerPalette[] = [
  { accent: '#c46b6b', glow: 'rgba(196,107,107,0.12)', bg: '#352e2e', border: '#5a4242' },   // Muted Rose
  { accent: '#c48f5a', glow: 'rgba(196,143,90,0.12)', bg: '#35302b', border: '#5a4d3a' },   // Muted Amber
  { accent: '#b8a94e', glow: 'rgba(184,169,78,0.12)', bg: '#33332b', border: '#55553a' },   // Muted Gold
  { accent: '#6db86a', glow: 'rgba(109,184,106,0.12)', bg: '#2c332c', border: '#3f553f' },  // Muted Sage
  { accent: '#5aafa0', glow: 'rgba(90,175,160,0.12)', bg: '#2c3331', border: '#3f554f' },   // Muted Teal
  { accent: '#5a9abf', glow: 'rgba(90,154,191,0.12)', bg: '#2c3035', border: '#3f4d5a' },   // Muted Sky
  { accent: '#8a6bb8', glow: 'rgba(138,107,184,0.12)', bg: '#302c35', border: '#4d3f5a' },  // Muted Lavender
  { accent: '#b86b96', glow: 'rgba(184,107,150,0.12)', bg: '#352c31', border: '#5a3f4d' },  // Muted Mauve
]

// Counter Types
export const COUNTER_TYPES = [
  '+1/+1', '-1/-1', 'Loyalty', 'Charge', 'Poison', '+2/+2', 'Oil', 'Shield', 'Lore'
]

