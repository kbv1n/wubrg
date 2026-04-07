"use client"

import { io, Socket } from "socket.io-client"
import type { GameState, PlayerState, CardState } from "./multiplayer-types"

// ─── Server URL ───────────────────────────────────────────────────────────────

function getServerUrl(): string {
  if (typeof window === "undefined") return ""
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:2567"
  // Socket.IO needs HTTP(S) — normalize wss:// and ws:// if passed
  return url.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://")
}

// ─── Module-level active socket (for GameActions) ─────────────────────────────
// Set by MultiplayerWrapper once a session is established, cleared on disconnect.
// This is NOT a singleton connection — just a pointer to the current active socket.

let _activeSocket: Socket | null = null

export function setActiveSocket(s: Socket | null) {
  _activeSocket = s
}

// ─── Connection primitives ────────────────────────────────────────────────────

/**
 * Create a new Socket.IO socket and wait for it to connect.
 * Returns the connected socket or throws on failure.
 */
export function openSocket(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(getServerUrl(), {
      transports: ["websocket", "polling"],
      timeout: 10000,
    })

    function onConnect() {
      cleanup()
      resolve(socket)
    }

    function onError(err: Error) {
      cleanup()
      socket.disconnect()
      reject(new Error(`Cannot reach game server — is it running? (${err.message})`))
    }

    function cleanup() {
      socket.off("connect", onConnect)
      socket.off("connect_error", onError)
    }

    socket.once("connect", onConnect)
    socket.once("connect_error", onError)
  })
}

/**
 * Create a new game room. Returns the room code.
 */
export function createRoom(socket: Socket, name: string, maxPlayers: number): Promise<string> {
  return new Promise((resolve, reject) => {
    socket.emit(
      "create_room",
      { name, maxPlayers },
      (res: { roomId?: string; error?: string }) => {
        if (res.error) reject(new Error(res.error))
        else resolve(res.roomId!)
      }
    )
  })
}

/**
 * Join an existing game room by code.
 */
export function joinRoom(socket: Socket, roomId: string, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.emit(
      "join_room",
      { roomId: roomId.toUpperCase().trim(), name },
      (res: { error?: string }) => {
        if (res.error) reject(new Error(res.error))
        else resolve()
      }
    )
  })
}

/**
 * Disconnect a socket and clear the active socket ref if it matches.
 */
export function closeSocket(socket: Socket) {
  socket.disconnect()
  if (_activeSocket === socket) _activeSocket = null
}

// ─── State conversion ─────────────────────────────────────────────────────────

/**
 * Convert the plain JSON object sent by the server into the typed GameState
 * the React components expect (players as Map, cmdDamage as Map, etc.)
 */
export function convertServerState(raw: Record<string, unknown>): GameState {
  const rawPlayers = (raw.players ?? {}) as Record<string, Record<string, unknown>>
  const players = new Map<string, PlayerState>()

  for (const [id, rp] of Object.entries(rawPlayers)) {
    const rawCmd = (rp.cmdDamage ?? {}) as Record<string, { dealt: number }>
    const cmdDamage = new Map(
      Object.entries(rawCmd).map(([k, v]) => [k, { dealt: v.dealt }])
    )

    players.set(id, {
      odId:        String(rp.odId ?? id),
      name:        String(rp.name ?? ""),
      pid:         Number(rp.pid ?? 0),
      life:        Number(rp.life ?? 40),
      poison:      Number(rp.poison ?? 0),
      colorIndex:  Number(rp.colorIndex ?? -1),
      playmatUrl:  String(rp.playmatUrl ?? ""),
      ready:       Boolean(rp.ready),
      connected:   Boolean(rp.connected ?? true),
      deckText:    String(rp.deckText ?? ""),
      battlefield: (rp.battlefield as CardState[]) ?? [],
      hand:        (rp.hand        as CardState[]) ?? [],
      library:     (rp.library     as CardState[]) ?? [],
      graveyard:   (rp.graveyard   as CardState[]) ?? [],
      exile:       (rp.exile       as CardState[]) ?? [],
      commandZone: (rp.commandZone as CardState[]) ?? [],
      cmdDamage,
    })
  }

  return {
    phase:       (raw.phase as GameState["phase"]) ?? "lobby",
    roomId:      String(raw.roomId      ?? ""),
    hostId:      String(raw.hostId      ?? ""),
    maxPlayers:  Number(raw.maxPlayers  ?? 4),
    turn:        Number(raw.turn        ?? 0),
    round:       Number(raw.round       ?? 1),
    players,
    takenColors: Array.isArray(raw.takenColors) ? (raw.takenColors as number[]) : [],
    log:         Array.isArray(raw.log)         ? (raw.log         as string[]) : [],
    playerOrder: Array.isArray(raw.playerOrder) ? (raw.playerOrder as string[]) : [],
  }
}

// ─── Game actions ─────────────────────────────────────────────────────────────
// All actions emit to the _activeSocket set by MultiplayerWrapper.
// If not connected, the action is silently dropped with a console warning.

function emit(event: string, data: Record<string, unknown> = {}) {
  if (!_activeSocket?.connected) {
    console.warn(`[GameActions] Not connected — dropped: ${event}`)
    return
  }
  _activeSocket.emit(event, data)
}

export const GameActions = {
  // ── Lobby ──────────────────────────────────────────────────────────────────
  setName:    (name: string)        => emit("set_name",    { name }),
  setColor:   (colorIndex: number)  => emit("set_color",   { colorIndex }),
  setPlaymat: (url: string)         => emit("set_playmat", { url }),
  pasteDeck:  (deckText: string)    => emit("paste_deck",  { deckText }),
  ready:      ()                    => emit("ready"),
  unready:    ()                    => emit("unready"),
  startGame:  ()                    => emit("start_game"),

  // ── Cards ──────────────────────────────────────────────────────────────────
  moveCard: (iid: string, toZone: string, x?: number, y?: number, index?: number) =>
    emit("move_card", {
      iid,
      toZone,
      ...(x     !== undefined && { x }),
      ...(y     !== undefined && { y }),
      ...(index !== undefined && { index }),
    }),
  tapCard:    (iid: string)              => emit("tap_card",    { iid }),
  untapCard:  (iid: string)              => emit("untap_card",  { iid }),
  flipCard:   (iid: string)              => emit("flip_card",   { iid }),
  addCounter: (iid: string, delta: number) => emit("add_counter", { iid, delta }),

  // ── Player ─────────────────────────────────────────────────────────────────
  drawCards:      (count: number)  => emit("draw_cards",      { count }),
  millCards:      (count: number)  => emit("mill_cards",      { count }),
  shuffleLibrary: ()               => emit("shuffle_library"),
  changeLife:     (delta: number)  => emit("change_life",     { delta }),
  changePoison:   (delta: number)  => emit("change_poison",   { delta }),
  passTurn:       ()               => emit("pass_turn"),
  untapAll:       ()               => emit("untap_all"),
}
