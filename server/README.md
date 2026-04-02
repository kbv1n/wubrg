# AstralMagic Colyseus Server

Real-time multiplayer server for AstralMagic built with Colyseus.

## Quick Start

```bash
cd server
npm install
npm run dev
```

The server will start on `ws://localhost:2567`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `2567` | WebSocket server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated list of allowed origins |

## Deployment

### Railway

1. Create a new Railway project
2. Connect your GitHub repository
3. Set the root directory to `/server`
4. Add environment variables:
   - `CORS_ORIGIN`: Your frontend URL (e.g., `https://your-app.vercel.app`)
5. Deploy

### Render

1. Create a new Web Service
2. Connect your repository
3. Set:
   - Build Command: `cd server && npm install && npm run build`
   - Start Command: `cd server && npm start`
4. Add environment variables

### Fly.io

```bash
cd server
fly launch
fly secrets set CORS_ORIGIN=https://your-app.vercel.app
fly deploy
```

## Frontend Configuration

Set the `NEXT_PUBLIC_COLYSEUS_URL` environment variable in your Vercel project:

```
NEXT_PUBLIC_COLYSEUS_URL=wss://your-server.railway.app
```

## Room Structure

### GameRoom

Main game room handling all multiplayer logic:

- **Phase: `lobby`** - Players join, select colors, paste decks, ready up
- **Phase: `playing`** - Full game with synchronized state

### Messages

Client -> Server messages:

| Type | Description |
|------|-------------|
| `set_name` | Update player name |
| `set_color` | Select player color |
| `paste_deck` | Load deck from text |
| `ready` / `unready` | Toggle ready state |
| `start_game` | Host starts the game |
| `move_card` | Move card between zones |
| `tap_card` / `untap_card` | Tap/untap a card |
| `draw_cards` | Draw from library |
| `change_life` | Modify life total |
| `pass_turn` | Pass to next player |

## Schema

The game state is synchronized using Colyseus Schema:

```typescript
GameState
├── phase: string
├── roomId: string
├── hostId: string
├── maxPlayers: number
├── turn: number
├── round: number
├── players: Map<string, PlayerState>
├── takenColors: number[]
├── log: string[]
└── playerOrder: string[]

PlayerState
├── odId: string (session ID)
├── name: string
├── pid: number
├── life: number
├── poison: number
├── colorIndex: number
├── ready: boolean
├── connected: boolean
├── battlefield: CardState[]
├── hand: CardState[]
├── library: CardState[]
├── graveyard: CardState[]
├── exile: CardState[]
└── commandZone: CardState[]
```

## Development

```bash
# Watch mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
