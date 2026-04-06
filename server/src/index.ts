import { Server } from "colyseus"
import { WebSocketTransport } from "@colyseus/ws-transport"
import { createServer } from "http"
import express from "express"
import cors from "cors"
import { GameRoom } from "./rooms/GameRoom"

const app = express()
const port = parseInt(process.env.PORT || "2567", 10)

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || "https://astralmagic.onrender.com"
app.use(cors({
  origin: corsOrigin.split(","),
  credentials: true
}))

app.use(express.json())

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", rooms: gameServer.matchMaker.stats.roomCount })
})

// List available rooms
app.get("/rooms", async (req, res) => {
  try {
    const rooms = await gameServer.matchMaker.query({ name: "game" })
    res.json(rooms.map(room => ({
      roomId: room.roomId,
      clients: room.clients,
      maxClients: room.maxClients,
      metadata: room.metadata
    })))
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rooms" })
  }
})

const httpServer = createServer(app)

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer
  })
})

// Register rooms
gameServer.define("game", GameRoom)
  .enableRealtimeListing()

// Start server
gameServer.listen(port).then(() => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║   AstralMagic Server                          ║
  ║   Listening on ws://localhost:${port}            ║
  ║   CORS Origin: ${corsOrigin.substring(0, 28).padEnd(28)}║
  ╚═══════════════════════════════════════════════╝
  `)
}).catch((err) => {
  console.error("Failed to start server:", err)
  process.exit(1)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...")
  gameServer.gracefullyShutdown()
})

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down...")
  gameServer.gracefullyShutdown()
})
