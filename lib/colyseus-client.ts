"use client"

import { Client, Room } from "colyseus.js"
import type { GameState, PlayerState, CardState, ClientMessage } from "./multiplayer-types"

// Server URL configuration
const getServerUrl = () => {
  if (typeof window === "undefined") return ""
  
  // Use environment variable in production, localhost in development
  const serverUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL
  if (serverUrl) return serverUrl
  
  // Default to localhost for development
  return "ws://localhost:2567"
}

// Singleton client instance
let client: Client | null = null

export function getClient(): Client {
  if (!client) {
    client = new Client(getServerUrl())
  }
  return client
}

// Room connection state
let currentRoom: Room | null = null

export function getCurrentRoom(): Room | null {
  return currentRoom
}

export function setCurrentRoom(room: Room | null) {
  currentRoom = room
}

// Create a new game room
export async function createRoom(playerName: string, maxPlayers: number = 4): Promise<Room> {
  const client = getClient()
  const room = await client.create("game", { 
    name: playerName,
    maxPlayers 
  })
  setCurrentRoom(room)
  return room
}

// Join an existing room by ID
export async function joinRoom(roomId: string, playerName: string): Promise<Room> {
  const client = getClient()
  const room = await client.joinById(roomId, { name: playerName })
  setCurrentRoom(room)
  return room
}

// Leave current room
export async function leaveRoom(): Promise<void> {
  if (currentRoom) {
    await currentRoom.leave()
    setCurrentRoom(null)
  }
}

// Send a message to the room
export function sendMessage<T extends ClientMessage["type"]>(
  type: T,
  data?: Omit<Extract<ClientMessage, { type: T }>, "type">
): void {
  if (!currentRoom) {
    console.warn("[Colyseus] No room connected, cannot send message:", type)
    return
  }
  currentRoom.send(type, data || {})
}

// Utility functions for common game actions
export const GameActions = {
  setName: (name: string) => sendMessage("set_name", { name }),
  setColor: (colorIndex: number) => sendMessage("set_color", { colorIndex }),
  setPlaymat: (url: string) => sendMessage("set_playmat", { url }),
  pasteDeck: (deckText: string) => sendMessage("paste_deck", { deckText }),
  ready: () => sendMessage("ready"),
  unready: () => sendMessage("unready"),
  startGame: () => sendMessage("start_game"),
  
  // Card actions
  moveCard: (iid: string, toZone: string, x?: number, y?: number, index?: number) => 
    sendMessage("move_card", { iid, toZone, x, y, index }),
  tapCard: (iid: string) => sendMessage("tap_card", { iid }),
  untapCard: (iid: string) => sendMessage("untap_card", { iid }),
  flipCard: (iid: string) => sendMessage("flip_card", { iid }),
  addCounter: (iid: string, delta: number) => sendMessage("add_counter", { iid, delta }),
  
  // Player actions
  drawCards: (count: number) => sendMessage("draw_cards", { count }),
  millCards: (count: number) => sendMessage("mill_cards", { count }),
  shuffleLibrary: () => sendMessage("shuffle_library"),
  changeLife: (delta: number) => sendMessage("change_life", { delta }),
  changePoison: (delta: number) => sendMessage("change_poison", { delta }),
  passTurn: () => sendMessage("pass_turn"),
  untapAll: () => sendMessage("untap_all"),
}

// Helper to convert Colyseus MapSchema to regular Map/Object
export function schemaToPlayers(playersSchema: any): Map<string, PlayerState> {
  const players = new Map<string, PlayerState>()
  
  if (!playersSchema) return players
  
  // Colyseus MapSchema iteration
  playersSchema.forEach((player: any, odId: string) => {
    players.set(odId, {
      odId: player.odId,
      name: player.name,
      pid: player.pid,
      life: player.life,
      poison: player.poison,
      colorIndex: player.colorIndex,
      playmatUrl: player.playmatUrl,
      ready: player.ready,
      connected: player.connected,
      deckText: player.deckText,
      battlefield: arraySchemaToArray(player.battlefield),
      hand: arraySchemaToArray(player.hand),
      library: arraySchemaToArray(player.library),
      graveyard: arraySchemaToArray(player.graveyard),
      exile: arraySchemaToArray(player.exile),
      commandZone: arraySchemaToArray(player.commandZone),
      cmdDamage: mapSchemaToMap(player.cmdDamage),
    })
  })
  
  return players
}

function arraySchemaToArray(arraySchema: any): CardState[] {
  if (!arraySchema) return []
  const result: CardState[] = []
  arraySchema.forEach((item: any) => {
    result.push({
      iid: item.iid,
      cardId: item.cardId,
      x: item.x,
      y: item.y,
      tapped: item.tapped,
      faceDown: item.faceDown,
      counters: item.counters,
      zone: item.zone,
    })
  })
  return result
}

function mapSchemaToMap(mapSchema: any): Map<string, { dealt: number }> {
  const result = new Map<string, { dealt: number }>()
  if (!mapSchema) return result
  mapSchema.forEach((value: any, key: string) => {
    result.set(key, { dealt: value.dealt })
  })
  return result
}

// Convert full game state from schema
export function schemaToGameState(state: any): GameState {
  return {
    phase: state.phase as GameState["phase"],
    roomId: state.roomId,
    hostId: state.hostId,
    maxPlayers: state.maxPlayers,
    turn: state.turn,
    round: state.round,
    players: schemaToPlayers(state.players),
    takenColors: state.takenColors ? [...state.takenColors] : [],
    log: state.log ? [...state.log] : [],
    playerOrder: state.playerOrder ? [...state.playerOrder] : [],
  }
}
