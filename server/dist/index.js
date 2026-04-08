"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const colyseus_1 = require("colyseus");
const ws_transport_1 = require("@colyseus/ws-transport");
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const GameRoom_1 = require("./rooms/GameRoom");
const app = (0, express_1.default)();
const port = parseInt(process.env.PORT || "2567", 10);
// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use((0, cors_1.default)({
    origin: corsOrigin.split(","),
    credentials: true
}));
app.use(express_1.default.json());
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok", rooms: gameServer.matchMaker.stats.roomCount });
});
// List available rooms
app.get("/rooms", async (req, res) => {
    try {
        const rooms = await gameServer.matchMaker.query({ name: "game" });
        res.json(rooms.map(room => ({
            roomId: room.roomId,
            clients: room.clients,
            maxClients: room.maxClients,
            metadata: room.metadata
        })));
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
});
const httpServer = (0, http_1.createServer)(app);
const gameServer = new colyseus_1.Server({
    transport: new ws_transport_1.WebSocketTransport({
        server: httpServer
    })
});
// Register rooms
gameServer.define("game", GameRoom_1.GameRoom)
    .enableRealtimeListing();
// Start server
gameServer.listen(port).then(() => {
    console.log(`
  ╔═══════════════════════════════════════════════╗
  ║   AstralMagic Server                          ║
  ║   Listening on ws://localhost:${port}            ║
  ║   CORS Origin: ${corsOrigin.substring(0, 28).padEnd(28)}║
  ╚═══════════════════════════════════════════════╝
  `);
}).catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
// Graceful shutdown
process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down...");
    gameServer.gracefullyShutdown();
});
process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down...");
    gameServer.gracefullyShutdown();
});
