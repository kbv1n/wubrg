# AstralMagic - MTG Commander Browser Game

A sophisticated, fully-featured Magic: The Gathering Commander browser game designed for local pass-the-laptop multiplayer sessions. Built with Next.js 15 and featuring a modern liquid glass UI inspired by iOS design principles, real-time card management with Scryfall API integration, and comprehensive Commander format rules support.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Technical Architecture](#technical-architecture)
4. [Component Breakdown](#component-breakdown)
5. [Data Layer](#data-layer)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [UI/UX Design System](#uiux-design-system)
9. [Game Mechanics Implementation](#game-mechanics-implementation)
10. [Self-Hosting Guide](#self-hosting-guide)
11. [Configuration](#configuration)
12. [Controls Reference](#controls-reference)
13. [Project Structure](#project-structure)
14. [License & Credits](#license--credits)

---

## Overview

AstralMagic is a browser-based implementation of Magic: The Gathering's Commander format, optimized for local multiplayer sessions where players pass a single device. The application provides a complete digital tabletop experience including:

- Full card database access via Scryfall API
- Interactive battlefield with drag-and-drop card manipulation
- Comprehensive zone management (library, hand, battlefield, graveyard, exile, command zone)
- Life total tracking with commander damage
- Counter management for complex board states
- Dice rolling and coin flipping utilities
- Customizable UI with adjustable glass opacity, card scaling, and zoom levels

---

## Features

### Core Gameplay
- **2-6 Player Support** - Flexible player count for various Commander pod sizes
- **Pass-the-Laptop Mode** - Seamless local multiplayer with player switching
- **40 Life Starting Total** - Commander format default with adjustable settings
- **Commander Damage Tracking** - Per-opponent damage counters (21 lethal threshold)
- **Poison Counter Support** - Full infect mechanic tracking

### Deck Management
- **Deck Import** - Parse decklists from text (MTGO/Arena format supported)
- **Scryfall Integration** - Automatic card data fetching with image caching
- **Commander Selection** - Pre-game legendary creature designation
- **Demo Mode** - Built-in 35-card demo deck for testing

### Battlefield Interaction
- **Drag-and-Drop Cards** - Smooth card positioning with collision detection
- **Tap/Untap Mechanics** - Click to toggle, visual rotation indicator
- **Pan and Zoom** - Spacebar + drag to pan, scroll wheel to zoom
- **Card Counters** - +1/+1, -1/-1, loyalty, charge, poison, shield, lore, oil counters
- **Token Generation** - Duplicate cards for token creation
- **Face-Down Cards** - Morph/manifest support with hidden card backs

### Zone Management
- **Library** - Draw, scry N, mill N, shuffle, search functionality
- **Hand** - Dock-style fan display with hover magnification
- **Graveyard** - Scrollable card list with search
- **Exile** - Separate zone for removed cards
- **Command Zone** - Commander casting with tax tracking

### Utilities
- **Dice Roller** - D4, D6, D8, D10, D12, D20 with animated results
- **Coin Flipper** - Heads/tails with visual animation
- **Game Log** - Complete action history with timestamps
- **Toast Notifications** - Life change alerts, turn announcements

### Customization
- **Custom Playmats** - Upload personal playmat images per player
- **Glass Opacity** - Adjustable UI transparency (50-100%)
- **Card Scale** - Battlefield card size adjustment (50-200%)
- **Zoom Levels** - Per-player zoom state preservation
- **Player Palettes** - Unique color themes per player position

---

## Technical Architecture

### Framework Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 15.x |
| Runtime | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui | Latest |
| Icons | Lucide React | Latest |
| API | Scryfall REST API | v1 |

### Architecture Pattern

The application follows a **single-page application (SPA)** pattern with client-side state management:

```
┌─────────────────────────────────────────────────────────────┐
│                        App Shell                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Screen Router                         ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   ││
│  │  │  Setup   │ │ Loading  │ │Commander │ │   Game   │   ││
│  │  │  Screen  │ │  Screen  │ │  Select  │ │  Screen  │   ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Game State                            ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                ││
│  │  │ Players  │ │  Turn    │ │   Log    │                ││
│  │  │  Array   │ │  State   │ │  Array   │                ││
│  │  └──────────┘ └──────────┘ └──────────┘                ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Rendering Strategy

- **Client-Side Rendering** - All game logic executes in browser
- **No Server State** - Fully offline-capable after initial load
- **API Calls** - Scryfall fetches happen during deck loading phase only

---

## Component Breakdown

### Core Components (`/components/game/`)

#### `player-mat.tsx` - Player Battlefield
The primary game surface for each player containing:
- **Battlefield Zone** - Infinite canvas with pan/zoom controls
- **Hand Display** - Dock-style card fan with hover magnification
- **Zone Buttons** - Quick access to library, graveyard, exile, command
- **Life Counter** - Inline +/- controls with color-coded thresholds
- **Player Header** - Name, life, poison counters display

**Key Features:**
- Wheel-based zoom with cursor-anchored scaling
- Spacebar + drag panning with momentum
- Per-player gradient backgrounds from palette
- Responsive layout for main vs opponent views

#### `center-divider.tsx` - Action Bar
Central control hub positioned at playmat intersection:
- **Logo Branding** - "AstralMagic" gradient text
- **Turn Indicator** - Active player highlight with glow effect
- **Life Controls** - Main player +/- buttons with haptic-style feedback
- **Action Buttons** - Draw, Untap All, Pass Turn
- **Utility Buttons** - Settings, Log toggle, Dice, Coin flip
- **Zoom Display** - Current zoom percentage

**Sub-bar Pattern:**
- Draw 7 (opening hand) / Draw 1 (subsequent draws)
- Untap All permanents
- Pass Turn with automatic untap

#### `card-token.tsx` - Card Renderer
Individual card representation on battlefield:
- **Image Display** - Scryfall image with fallback text
- **Tap State** - 90-degree rotation with amber glow
- **Counter Badges** - Bottom-aligned counter pills
- **Summoning Sickness** - Orange "Z" indicator for creatures
- **Face-Down Mode** - Card back image display

**Dimensions:** Base 126x176px (doubled from standard 63x88 for retina)

#### `context-menu.tsx` - Right-Click Actions
Context-sensitive action menu:
- **Tap/Untap** - Toggle card state
- **Zone Transfers** - Move to hand, graveyard, exile, library
- **Transform** - MDFC/DFC flip support
- **Counters** - Open counter management modal
- **Duplicate** - Create token copy

**Viewport Clamping:** Menu repositions to stay within visible area

#### `zone-viewer.tsx` - Zone Modal
Full-screen zone inspection:
- **Card Grid** - Scrollable card thumbnails
- **Search Filter** - Real-time name filtering
- **Library Actions** - Scry N, Mill N, Shuffle, Search
- **Card Actions** - Move to any zone via hover menu
- **Reveal Toggle** - Show/hide face-down cards

#### `mana-symbols.tsx` - Mana Cost Display
Scryfall-style mana symbol rendering:
- **Symbol Parsing** - Regex extraction of `{X}` patterns
- **Image Mode** - MTG Wiki SVG symbols
- **Fallback Mode** - Colored circle with text
- **Oracle Text** - Inline symbol replacement in card text

**Supported Symbols:** W, U, B, R, G, C, 0-10, X, Y, Z, hybrid, phyrexian

#### `modals.tsx` - Modal Collection
Utility modals for game actions:

| Modal | Purpose |
|-------|---------|
| `CounterModal` | Add/remove card counters |
| `CmdDmgModal` | Track commander damage per opponent |
| `ScryModal` | Scry N with top/bottom sorting |
| `DiceModal` | D4-D20 rolling with animation |
| `UISettingsModal` | Card scale, zoom, glass opacity |
| `Toast` | Temporary notification display |

#### `damage-toast.tsx` - Life Change Notifications
Cumulative damage tracking with debounced display:
- **Aggregation** - Multiple rapid changes combine
- **Color Coding** - Player palette-based styling
- **Auto-dismiss** - 800ms debounce timer

### Supporting Components

#### `setup-screen.tsx` - Game Configuration
Pre-game setup interface:
- Player count selection (2-6)
- Player name input
- Deck import textarea
- Playmat upload with fit options
- Starting life adjustment

#### `loading-screen.tsx` - Scryfall Fetch Progress
Deck loading progress display:
- Card count progress bar
- Current card name display
- Animated logo treatment

#### `commander-select.tsx` - Commander Designation
Post-load commander selection:
- Grid of legendary creatures
- Multi-commander support (partners)
- Ready state per player

---

## Data Layer

### Type Definitions (`/lib/game-types.ts`)

#### `CardData` - Scryfall Card Schema
```typescript
interface CardData {
  name: string           // Card name
  manaCost: string       // Mana cost string "{2}{U}{U}"
  cmc: number           // Converted mana cost
  typeLine: string      // Full type line
  oracle: string        // Oracle text
  power: string | null  // Power (creatures)
  tough: string | null  // Toughness (creatures)
  loyalty: string | null // Loyalty (planeswalkers)
  rarity: string        // common/uncommon/rare/mythic
  set: string           // Set code
  isLegendary: boolean  // Legendary supertype
  isCreature: boolean   // Creature type
  isPlaneswalker: boolean
  isLand: boolean
  mdfc?: boolean        // Modal double-faced card
  img: string | null    // Front image URL
  imgBack?: string | null // Back image URL (MDFC)
  backName?: string | null
  backType?: string | null
  backPower?: string | null
  backTough?: string | null
}
```

#### `CardInstance` - Game Card State
```typescript
interface CardInstance extends CardData {
  iid: string           // Unique instance ID
  tapped: boolean       // Tap state
  showBack: boolean     // Showing back face
  faceDown: boolean     // Face-down (morph)
  summonSick: boolean   // Summoning sickness
  counters: Record<string, number>  // Counter types
  x: number             // Battlefield X position (%)
  y: number             // Battlefield Y position (%)
  z: number             // Z-index for stacking
}
```

#### `Player` - Player State
```typescript
interface Player {
  pid: number           // Player index
  name: string          // Display name
  pal: PlayerPalette    // Color theme
  life: number          // Life total
  poison: number        // Poison counters
  cmdDmg: Record<number, number>  // Commander damage per opponent
  library: CardInstance[]
  hand: CardInstance[]
  battlefield: CardInstance[]
  graveyard: CardInstance[]
  exile: CardInstance[]
  command: CardInstance[]
  manaPool: Record<string, number>  // Floating mana
  maxZ: number          // Z-index counter
  isDemo: boolean       // Using demo deck
  missed: number        // Cards not found
  playmat: string       // Playmat image URL
  playmatFit: string    // CSS object-fit value
}
```

#### `GameState` - Global Game State
```typescript
interface GameState {
  players: Player[]
  turn: number          // Active player index
  round: number         // Round counter
  log: string[]         // Action log (newest first)
}
```

#### `PlayerPalette` - Visual Theme
```typescript
interface PlayerPalette {
  accent: string        // Primary accent color
  glow: string          // Glow effect color (rgba)
  bg: string            // Background tint
  border: string        // Border color
  gradient?: string     // Battlefield gradient CSS
}
```

### Data Utilities (`/lib/game-data.ts`)

#### Demo Data
35 pre-embedded Commander staple cards for offline/demo play:
- Sol Ring, Command Tower, Arcane Signet
- Counterspell, Lightning Bolt, Swords to Plowshares
- Cultivate, Cyclonic Rift, Wrath of God
- And 26 more common EDH cards

#### Scryfall Integration

**`fetchScryfall(names, onProgress)`**
Batch fetches card data from Scryfall Collection API:
- 75 cards per request (API limit)
- 110ms delay between batches (rate limiting)
- Progress callback for UI updates
- Response caching to prevent duplicate fetches

**`lookupCard(name)`**
Retrieves card from cache (demo or fetched):
- Case-insensitive matching
- Returns null for unknown cards

**`parseDeck(text)`**
Parses decklist text into card entries:
- Supports MTGO/Arena format: `4 Lightning Bolt`
- Section headers: Commander, Deck, Sideboard
- Ignores comments (`//`, `#`)
- Handles set codes: `4 Lightning Bolt (M11)`

**`createCardInstance(data)`**
Converts CardData to CardInstance:
- Generates unique `iid` via crypto.randomUUID()
- Initializes game state (untapped, no counters)
- Random battlefield position

**`parseManaProduction(card)`**
Extracts mana production from oracle text:
- Regex matches "Add {X}" patterns
- Returns color -> count mapping
- Handles "any color" with colorless fallback

---

## State Management

### React State Architecture

The application uses React's built-in `useState` hooks for all state management, organized into logical groups:

#### Screen State
```typescript
const [screen, setScreen] = useState<ScreenType>('setup')
// 'setup' | 'loading' | 'commander-select' | 'game'
```

#### Game State
```typescript
const [game, setGame] = useState<GameState | null>(null)
```

#### UI State
```typescript
const [uiSettings, setUISettings] = useState({
  cardScale: 1,
  defaultZoom: 1,
  showZoomPanel: true,
  uiScale: 1,
  glassOpacity: 0.85
})
```

#### Per-Player State
```typescript
const [zooms, setZooms] = useState<Record<number, number>>({})
const [pans, setPans] = useState<Record<number, { x: number; y: number }>>({})
```

### Mutation Pattern

The `mut()` helper function provides immutable state updates:
```typescript
const mut = (fn: (g: GameState) => void) => {
  setGame((prev) => {
    if (!prev) return prev
    const next = deepClone(prev)
    fn(next)
    return next
  })
}
```

This pattern:
- Deep clones player arrays to prevent mutation
- Allows imperative-style updates in callback
- Maintains React's immutability requirements

---

## API Integration

### Scryfall API

**Endpoint:** `https://api.scryfall.com/cards/collection`

**Method:** POST with JSON body

**Request Format:**
```json
{
  "identifiers": [
    { "name": "Lightning Bolt" },
    { "name": "Counterspell" }
  ]
}
```

**Response Handling:**
- `data[]` - Successfully found cards
- `not_found[]` - Cards that couldn't be located

**Rate Limiting:**
- 75 cards per request maximum
- 100ms minimum delay between requests
- Implemented via setTimeout between batches

**Image URLs:**
- Uses `image_uris.normal` (672x936px)
- Falls back to card_faces[0] for MDFCs
- Cached in module-level object

---

## UI/UX Design System

### Color Palette

**Base Theme (Flat Space Indigo):**
```css
--background: #2d3047    /* Space Indigo */
--foreground: #edf5fc    /* Alice Blue */
--primary: #03b5aa       /* Light Sea Green */
--accent: #1fa2ff        /* Dodger Blue */
--destructive: #eb5c68   /* Bubblegum Pink */
--border: #4a5070        /* Muted Indigo */
```

**Player Palettes (Vibrant Flat Colors):**
| Player | Accent | Description |
|--------|--------|-------------|
| 1 | #f44a4a | Strawberry Red |
| 2 | #fb8f23 | Dark Orange |
| 3 | #fee440 | Banana Cream |
| 4 | #7aff60 | Mint Glow |
| 5 | #00f5d4 | Aquamarine |
| 6 | #00bbf9 | Deep Sky Blue |
| 7 | #9b5de5 | Lavender Purple |
| 8 | #f15bb5 | Deep Pink |

### Glass Morphism System

Four glass variants with CSS variable-controlled opacity (flat backgrounds):

```css
.liquid-glass {
  backdrop-filter: blur(16px);
  background: rgba(45, 48, 71, calc(var(--glass-opacity) * 0.85));
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.liquid-glass-subtle { /* 60% opacity base */ }
.liquid-glass-strong { /* 100% opacity base */ }
.liquid-glass-readable { /* 95% fixed for text contrast */ }
```

**Design Philosophy:**
- No gradients - all UI elements use flat, solid colors
- Clean borders with subtle opacity for depth
- High contrast player colors for easy identification

### Typography

- **Headings:** Geist Sans (system font stack fallback)
- **Body:** Geist Sans
- **Monospace:** Geist Mono (for numbers/stats)

### Animation Classes

```css
@keyframes card-enter {
  from { opacity: 0; transform: scale(0.9) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px currentColor; }
  50% { box-shadow: 0 0 16px currentColor, 0 0 24px currentColor; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Game Mechanics Implementation

### Turn Structure

1. **Untap** - Automatic on turn start
2. **Upkeep** - Manual triggers
3. **Draw** - Manual via action bar
4. **Main Phase** - Card playing
5. **Combat** - Tap attackers
6. **Main Phase 2** - Post-combat plays
7. **End Step** - Pass turn button

### Life Tracking

- Click +/- buttons or use keyboard shortcuts
- Cumulative damage toasts aggregate rapid changes
- Critical warnings at 10 life and 0 life
- Negative life supported (for effects like Phyrexian Unlife)

### Card Tapping

- **Click** (no drag) - Toggles tap state
- **Tap** - 90-degree clockwise rotation
- **Mana Production** - Auto-detected from oracle text and added to mana pool

### Zone Transfers

All zone movements create new `iid` to prevent React key conflicts:
```typescript
card.iid = crypto.randomUUID()
card.tapped = false
card.summonSick = toZone === 'battlefield'
```

### Commander Rules

- **Commander Tax** - Not yet implemented (manual tracking)
- **Commander Damage** - Per-opponent tracking via modal
- **21 Damage** - Visual warning (manual game loss)
- **Color Identity** - Displayed but not enforced

---

## Self-Hosting Guide

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm/yarn

### Quick Start

```bash
# Clone repository
git clone <your-repo-url>
cd astralmagic

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
pnpm build
pnpm start
```

### Docker Deployment

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t astralmagic .
docker run -p 3000:3000 astralmagic
```

### Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push to GitHub
2. Import in Vercel
3. Deploy (zero configuration needed)

---

## Configuration

### Environment Variables

None required - the application runs entirely client-side.

### UI Settings

| Setting | Description | Range | Default |
|---------|-------------|-------|---------|
| Card Scale | Battlefield card size | 50-200% | 100% |
| Default Zoom | Initial zoom level | 15-400% | 100% |
| UI Scale | Overall interface scale | 50-150% | 100% |
| Glass Opacity | Panel transparency | 50-100% | 85% |
| Card Preview | Hover preview enabled | On/Off | On |

---

## Controls Reference

### Battlefield

| Action | Control |
|--------|---------|
| Move card | Click + drag |
| Tap/Untap | Click (without drag) |
| Card menu | Right-click |
| Pan view | Space + drag |
| Zoom | Mouse wheel |
| Reset view | Click zoom % |

### Hand

| Action | Control |
|--------|---------|
| Play card | Drag to battlefield |
| View card | Hover (magnifies) |
| Card menu | Right-click |

### Keyboard

| Key | Action |
|-----|--------|
| Space | Hold to enable pan mode |
| Escape | Close modals |

---

## Project Structure

```
astralmagic/
├── app/
│   ├── page.tsx              # Main game component (985 lines)
│   ├── layout.tsx            # Root layout with metadata
│   ├── globals.css           # Design tokens & glass effects
│   └── global-error.tsx      # Error boundary
├── components/
│   ├── game/
│   │   ├── player-mat.tsx    # Player battlefield (500+ lines)
│   │   ├── center-divider.tsx # Action bar (260 lines)
│   │   ├── card-token.tsx    # Card renderer (95 lines)
│   │   ├── card-image.tsx    # Image component with fallback
│   │   ├── context-menu.tsx  # Right-click menu (120 lines)
│   │   ├── zone-viewer.tsx   # Zone modal (200+ lines)
│   │   ├── mana-symbols.tsx  # Mana cost display (130 lines)
│   │   ├── modals.tsx        # Utility modals (650+ lines)
│   │   ├── damage-toast.tsx  # Life change notifications
│   │   ├── setup-screen.tsx  # Pre-game configuration
│   │   ├── loading-screen.tsx # Deck loading progress
│   │   ├── commander-select.tsx # Commander designation
│   │   ├── game-log.tsx      # Action history
│   │   ├── action-log-popdown.tsx # Collapsible log
│   │   ├── turn-bar.tsx      # Turn indicator
│   │   └── card-zoom.tsx     # Large card preview
│   ├── ui/                   # shadcn/ui components
│   └── theme-provider.tsx    # Dark mode support
├── lib/
│   ├── game-types.ts         # TypeScript interfaces (110 lines)
│   ├── game-data.ts          # Data utilities (250 lines)
│   └── utils.ts              # cn() helper
├── hooks/
│   ├── use-mobile.ts         # Mobile detection
│   └── use-toast.ts          # Toast notifications
├── public/                   # Static assets
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## License & Credits

### License

MIT License - Free to use, modify, and distribute.

### Credits

- **Card Data & Images:** [Scryfall](https://scryfall.com/) - The MTG card database
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) - Beautifully designed components
- **Icons:** [Lucide](https://lucide.dev/) - Beautiful & consistent icon set
- **Mana Symbols:** [MTG Wiki](https://mtg.fandom.com/) - Official symbol assets
- **Framework:** [Next.js](https://nextjs.org/) by Vercel
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)

---

*AstralMagic is not affiliated with Wizards of the Coast. Magic: The Gathering and all related properties are trademarks of Wizards of the Coast LLC.*
