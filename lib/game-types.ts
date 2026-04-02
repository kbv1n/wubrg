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
  manaPool: Record<string, number>
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
  { accent: '#f44a4a', glow: 'rgba(244,74,74,0.15)', bg: '#3d2d2d', border: '#6a4040' },   // Strawberry Red
  { accent: '#fb8f23', glow: 'rgba(251,143,35,0.15)', bg: '#3d352d', border: '#6a5540' },  // Dark Orange
  { accent: '#fee440', glow: 'rgba(254,228,64,0.15)', bg: '#3d3d2d', border: '#6a6a40' },  // Banana Cream
  { accent: '#7aff60', glow: 'rgba(122,255,96,0.15)', bg: '#2d3d2d', border: '#406a40' },  // Mint Glow
  { accent: '#00f5d4', glow: 'rgba(0,245,212,0.15)', bg: '#2d3d3a', border: '#406a60' },   // Aquamarine
  { accent: '#00bbf9', glow: 'rgba(0,187,249,0.15)', bg: '#2d353d', border: '#40556a' },   // Deep Sky Blue
  { accent: '#9b5de5', glow: 'rgba(155,93,229,0.15)', bg: '#352d3d', border: '#55406a' },  // Lavender Purple
  { accent: '#f15bb5', glow: 'rgba(241,91,181,0.15)', bg: '#3d2d38', border: '#6a4058' },  // Deep Pink
]

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
