# AstralMagic

A browser-based Magic: The Gathering Commander game with real-time online multiplayer. Play with friends in the same room or across the internet — no accounts, no downloads, just share a room code and play.

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 + React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Realtime | Socket.IO (WebSocket + polling fallback) |
| Server | Node.js + Express |
| Card Data | Scryfall API |

---

## Quick Start

### 1. Install dependencies

```bash
# Frontend (repo root)
pnpm install

# Game server
cd server && pnpm install
```

### 2. Environment

Create `.env.local` in the repo root:

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:2567
```

The server uses port `2567` by default. Override with the `PORT` env var on the server side.

### 3. Run locally

In two terminals:

```bash
# Terminal 1 — game server
cd server && pnpm dev

# Terminal 2 — Next.js frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How to Play

### Multiplayer

1. Player 1 clicks **Host Game**, sets a name and player limit, pastes their decklist, picks a color, and clicks **Ready**.
2. Share the 6-character room code (e.g. `K7MN2P`) with everyone else.
3. Other players click **Join Game**, enter the code and their name, paste their decklist, pick a color, and click **Ready**.
4. Once all players are ready, the host clicks **Start Game**.
5. Cards are fetched from Scryfall before the board loads — a progress screen shows the fetch status.

### Solo / Testing

In the lobby, click **Solo Test (fill with bots & start)**. The server fills the remaining player slots with bot players using a demo deck and starts immediately. Useful for testing card interactions or the board layout without needing other players.

### Joining via link

Room codes are not in the URL by default. Just share the 6-character code verbally or in a message.

---

## Deck Format

Paste a standard MTGO/Arena style decklist. Commanders are marked with `*CMDR*`:

```
1 Atraxa, Praetors' Voice *CMDR*
1 Sol Ring
1 Command Tower
1 Arcane Signet
4 Counterspell
...
```

- One card per line: `<count> <name>`
- Set codes in parentheses are ignored: `1 Lightning Bolt (M11)` → fetches "Lightning Bolt"
- Lines starting with `//` or `#` are treated as comments
- Section headers (`Commander`, `Deck`, `Sideboard`) are skipped automatically

---

## Controls

### Battlefield

| Action | How |
|--------|-----|
| Move a card | Click + drag |
| Tap / Untap | Click without dragging |
| Card actions | Right-click |
| Pan | Space + drag |
| Zoom | Mouse wheel |

### Hand

| Action | How |
|--------|-----|
| Play to battlefield | Drag card out of hand onto the mat |
| Inspect | Hover to magnify |
| Card actions | Right-click |

### Keyboard

| Key | Action |
|-----|--------|
| `Space` | Hold to pan |
| `Esc` | Close modals |

---

## Project Structure

```
AstralMagic/
├── app/
│   ├── page.tsx                    # Root page — hosts the multiplayer flow
│   ├── layout.tsx
│   └── globals.css                 # Design tokens, glass effects
├── components/
│   ├── game/                       # Core gameplay components (singleplayer + shared)
│   │   ├── player-mat.tsx          # Individual player battlefield
│   │   ├── center-divider.tsx      # Action bar overlay
│   │   ├── card-token.tsx          # Card on battlefield
│   │   ├── card-image.tsx          # Card image with fallback
│   │   ├── context-menu.tsx        # Right-click menu
│   │   ├── zone-viewer.tsx         # Library / graveyard / exile modal
│   │   ├── modals.tsx              # Counter, dice, scry, settings modals
│   │   ├── setup-screen.tsx        # Local dev / singleplayer setup
│   │   ├── loading-screen.tsx      # Scryfall fetch progress
│   │   └── commander-select.tsx    # Commander designation screen
│   └── multiplayer/
│       ├── MultiplayerWrapper.tsx  # Socket.IO lifecycle, state bridge
│       ├── LobbyScreen.tsx         # Lobby UI (ready up, room code, etc.)
│       └── MultiplayerGameBoard.tsx # In-game board for networked play
├── lib/
│   ├── game-types.ts               # Single source of truth for all types
│   ├── game-data.ts                # Scryfall fetch, deck parsing, card utils
│   ├── socket-client.ts            # Socket.IO connection helpers + GameActions
│   └── utils.ts                    # cn() helper
├── server/
│   └── src/
│       ├── index.ts                # Express + Socket.IO server entry point
│       └── GameRoom.ts             # Room state machine, all game logic
└── public/
```

---

## Architecture

### Type System

All shared types live in `lib/game-types.ts`. There is no separate `multiplayer-types.ts` — it was merged in to keep a single source of truth.

Key types:

- **`CardData`** — Scryfall card info (name, image, oracle text, etc.)
- **`CardInstance`** — A card in play (extends `CardData` with `iid`, `tapped`, `x/y`, counters…)
- **`CardState`** — Lightweight networked card (what the server stores: `iid`, `cardId`, `x`, `y`, `tapped`, `zone`)
- **`PlayerState`** — Networked player (life, hand, battlefield, etc. All zones as `CardState[]`)
- **`MPGameState`** — Full game snapshot as sent by the server (`players: Map<string, PlayerState>`)
- **`GameState`** — Local game state for singleplayer / UI (`players: Player[]`)

### Card Coordinate System

Cards on the battlefield are positioned using **percentages** (0–100) relative to the playmat element. This keeps positions resolution-independent and works correctly with CSS `transform`-based pan/zoom.

When a card is dropped:

```
x = (pointerX - mat.left) / mat.width  * 100
y = (pointerY - mat.top)  / mat.height * 100
```

`getBoundingClientRect()` on the mat already returns visual (post-transform) bounds, so pan and zoom do not need to be subtracted separately.

### Multiplayer State Flow

```
Client                          Server (GameRoom)
  │                                    │
  │── create_room / join_room ────────►│
  │◄─ ack({ roomId }) ────────────────│
  │                                    │
  │── set_name, set_color, paste_deck ►│ (updates PlayerState)
  │── ready ──────────────────────────►│
  │◄─ game_state (broadcast) ─────────│
  │                                    │
  │── start_game ──────────────────────►│ (phase: lobby → playing)
  │◄─ game_state (broadcast) ──────────│
  │                                    │
  │── move_card, tap_card, draw_cards ►│ (mutates state, broadcasts)
  │◄─ game_state (broadcast) ──────────│
```

Every mutation on the server calls `broadcastState()` which emits the full `MPGameState` snapshot to all players in the room. Clients call `convertServerState()` to hydrate the plain JSON back into typed objects (Maps, etc.).

### Connection Lifecycle (`MultiplayerWrapper`)

1. On mount, `openSocket()` creates a Socket.IO connection.
2. On success, the socket is stored via `setActiveSocket()` so `GameActions` can emit.
3. The wrapper listens to `game_state` events and updates React state.
4. On unmount or navigation, `closeSocket()` disconnects and clears the ref.

React StrictMode double-mount is handled with a `cancelled` flag in the connection `useEffect`.

### Scryfall Loading

The multiplayer board fetches all card images before rendering. On mount, `MultiplayerGameBoard` collects every `cardId` from every player's zones, calls `fetchScryfall()`, and shows a `LoadingScreen` with live progress until all cards are resolved. This prevents cards appearing without images during play.

`fetchScryfall` uses Scryfall's `/cards/collection` endpoint:
- Up to 75 cards per POST request
- 110 ms delay between batches to respect rate limits
- Results cached in a module-level map — subsequent lookups are instant

---

## Deployment

### Server (Render)

1. Create a new **Web Service** pointing to the `server/` directory.
2. Build command: `pnpm install && pnpm build`
3. Start command: `node dist/index.js`
4. Set env vars:
   - `PORT` — Render sets this automatically
   - `CORS_ORIGIN` — comma-separated list of your frontend URL(s), e.g. `https://your-app.vercel.app`

### Frontend (Vercel)

1. Import the repo root on Vercel.
2. Set env var:
   - `NEXT_PUBLIC_SOCKET_URL` — your Render server URL, e.g. `https://astralmagic-server.onrender.com`
3. Deploy.

---

## Known Limitations

- **No persistence** — Server state is in memory. Restarting the server ends all active games.
- **No reconnect recovery** — If a player's browser closes mid-game, they can rejoin the room (same code) but their hand and battlefield state are preserved on the server.
- **Bot players are static** — Bots added by "Solo Test" don't take actions; they exist only to fill player slots so the layout and card interactions can be tested.
- **Commander Tax** — Not automatically enforced. Track manually.
- **Mobile** — Designed for desktop. Touch drag is not implemented.

---

## Credits

- **Card data & images:** [Scryfall](https://scryfall.com/)
- **UI components:** [shadcn/ui](https://ui.shadcn.com/)
- **Icons:** [Lucide](https://lucide.dev/)
- **Framework:** [Next.js](https://nextjs.org/) by Vercel

*AstralMagic is not affiliated with Wizards of the Coast. Magic: The Gathering and all related properties are trademarks of Wizards of the Coast LLC.*
