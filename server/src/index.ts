import { createServer } from "http"
import express from "express"
import cors from "cors"
import { Server as SocketIOServer } from "socket.io"
import { GameRoom } from "./GameRoom"

const app = express()
const port = parseInt(process.env.PORT || "2567", 10)

// CORS configuration
// In production set CORS_ORIGIN env var (comma-separated) on Render.
// In development (no env var) allow any origin so localhost:3000 works.
const corsOrigin = process.env.CORS_ORIGIN || ""
const allowedOrigins: string | string[] = corsOrigin
  ? corsOrigin.split(",").map(o => o.trim())
  : "*"

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))

app.use(express.json())

// ─── REST endpoints ───────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.get("/rooms", (_req, res) => {
  const list = Array.from(rooms.values()).map(room => {
    const state = room.getState()
    return {
      roomId: state.roomId,
      clients: Object.keys(state.players).length,
      maxClients: state.maxPlayers,
      phase: state.phase,
    }
  })
  res.json(list)
})

// ─── Socket.IO setup ──────────────────────────────────────────────────────────

const httpServer = createServer(app)

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})

// Active rooms registry: roomId → GameRoom
const rooms = new Map<string, GameRoom>()

// Track which room each socket is in: socketId → roomId
const socketRoom = new Map<string, string>()

// Generate short human-friendly room code
function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let id = ""
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return rooms.has(id) ? generateRoomId() : id
}

// ─── Socket.IO event handlers ─────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`)

  // ── Create room ────────────────────────────────────────────────────────────
  socket.on("create_room", (
    payload: { name?: string; maxPlayers?: number },
    ack: (res: { roomId?: string; error?: string }) => void
  ) => {
    const maxPlayers = Math.min(Math.max(payload.maxPlayers || 4, 2), 8)
    const roomId = generateRoomId()

    const room = new GameRoom(io, roomId, socket.id, maxPlayers)
    rooms.set(roomId, room)

    socket.join(roomId)
    socketRoom.set(socket.id, roomId)

    const joinResult = room.onJoin(socket.id, payload.name || "")
    if (joinResult.error) {
      rooms.delete(roomId)
      socketRoom.delete(socket.id)
      ack({ error: joinResult.error })
      return
    }

    console.log(`[Socket.IO] Room ${roomId} created by ${socket.id}`)
    ack({ roomId })
  })

  // ── Join existing room ─────────────────────────────────────────────────────
  socket.on("join_room", (
    payload: { roomId?: string; name?: string },
    ack: (res: { error?: string }) => void
  ) => {
    const roomId = (payload.roomId || "").toUpperCase().trim()
    const room = rooms.get(roomId)

    if (!room) {
      ack({ error: "Room not found" })
      return
    }

    // Join the Socket.IO channel BEFORE onJoin so the broadcast reaches this socket
    socket.join(roomId)
    socketRoom.set(socket.id, roomId)

    const joinResult = room.onJoin(socket.id, payload.name || "")
    if (joinResult.error) {
      socket.leave(roomId)
      socketRoom.delete(socket.id)
      ack({ error: joinResult.error })
      return
    }

    console.log(`[Socket.IO] ${socket.id} joined room ${roomId}`)
    ack({})
  })

  // ── Disconnect / leave ────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`)
    const roomId = socketRoom.get(socket.id)
    if (!roomId) return

    const room = rooms.get(roomId)
    if (room) {
      room.onLeave(socket.id)

      // Delete empty lobby rooms immediately
      if (room.isEmpty()) {
        rooms.delete(roomId)
        console.log(`[Socket.IO] Room ${roomId} deleted (empty)`)
      }
    }

    socketRoom.delete(socket.id)
  })

  // ── Game message forwarding ───────────────────────────────────────────────
  // All game actions are routed through a single handler to keep this clean
  const gameEvents = [
    "set_name", "set_color", "set_playmat", "paste_deck",
    "ready", "unready", "start_game",
    "move_card", "tap_card", "untap_card", "flip_card", "add_counter",
    "draw_cards", "mill_cards", "shuffle_library",
    "change_life", "change_poison",
    "pass_turn", "untap_all",
  ] as const

  for (const eventName of gameEvents) {
    socket.on(eventName, (data: Record<string, unknown> = {}) => {
      const roomId = socketRoom.get(socket.id)
      if (!roomId) return
      const room = rooms.get(roomId)
      if (!room) return
      room.handleMessage(socket.id, eventName, data)
    })
  }
})

// ─── Start server ─────────────────────────────────────────────────────────────

httpServer.listen(port, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║   AstralMagic Server (Socket.IO)              ║
  ║   Listening on port ${String(port).padEnd(25)}║
  ║   CORS: ${corsOrigin.substring(0, 36).padEnd(36)}║
  ╚═══════════════════════════════════════════════╝
  `)
})

// ─── Graceful shutdown ────────────────────────────────────────────────────────

function shutdown() {
  console.log("Shutting down gracefully...")
  io.close(() => {
    httpServer.close(() => {
      process.exit(0)
    })
  })
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
