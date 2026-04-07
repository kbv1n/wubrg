import { Server as SocketIOServer } from "socket.io"
import {
  GameState,
  PlayerState,
  CardState,
  MoveCardPayload,
  DrawPayload,
  MillPayload,
  LifePayload,
  PoisonPayload,
  SetNamePayload,
  SetColorPayload,
  SetPlaymatPayload,
  PasteDeckPayload,
  CounterPayload,
} from "./types"

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Generate unique card instance ID
function uid(): string {
  return Math.random().toString(36).substring(2, 15)
}

export class GameRoom {
  readonly roomId: string
  private io: SocketIOServer
  private state: GameState
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null

  constructor(io: SocketIOServer, roomId: string, hostSocketId: string, maxPlayers: number) {
    this.io = io
    this.roomId = roomId
    this.state = {
      phase: "lobby",
      roomId,
      hostId: hostSocketId,
      maxPlayers,
      turn: 0,
      round: 1,
      players: {},
      takenColors: [],
      log: [],
      playerOrder: [],
    }
    console.log(`[GameRoom] Created room ${roomId} (max ${maxPlayers} players)`)
  }

  // ─── Player lifecycle ─────────────────────────────────────────────────────

  onJoin(socketId: string, name: string): { error?: string } {
    const playerCount = Object.keys(this.state.players).length

    // Reconnection during active game
    if (this.state.phase !== "lobby") {
      const existing = Object.values(this.state.players).find(
        p => p.name === name && !p.connected
      )
      if (existing) {
        existing.odId = socketId
        existing.connected = true
        this.addLog(`${existing.name} reconnected`)
        this.broadcast()
        return {}
      }
      return { error: "Game already in progress" }
    }

    if (playerCount >= this.state.maxPlayers) {
      return { error: "Room is full" }
    }

    const player: PlayerState = {
      odId: socketId,
      name: name || `Player ${playerCount + 1}`,
      pid: playerCount,
      life: 40,
      poison: 0,
      colorIndex: -1,
      playmatUrl: "",
      ready: false,
      connected: true,
      deckText: "",
      battlefield: [],
      hand: [],
      library: [],
      graveyard: [],
      exile: [],
      commandZone: [],
      cmdDamage: {},
    }

    this.state.players[socketId] = player
    this.state.playerOrder.push(socketId)

    this.addLog(`${player.name} joined the lobby`)
    console.log(`[GameRoom] ${player.name} joined room ${this.roomId} (${socketId})`)
    this.broadcast()
    return {}
  }

  onLeave(socketId: string) {
    const player = this.state.players[socketId]
    if (!player) return

    if (this.state.phase === "lobby") {
      // Release color
      if (player.colorIndex >= 0) {
        this.state.takenColors = this.state.takenColors.filter(c => c !== player.colorIndex)
      }

      // Remove from order
      this.state.playerOrder = this.state.playerOrder.filter(id => id !== socketId)
      delete this.state.players[socketId]
      this.addLog(`${player.name} left the lobby`)

      // Reassign host if needed
      if (this.state.hostId === socketId && this.state.playerOrder.length > 0) {
        const newHostId = this.state.playerOrder[0]
        this.state.hostId = newHostId
        const newHost = this.state.players[newHostId]
        if (newHost) this.addLog(`${newHost.name} is now the host`)
      }
    } else {
      // In-game: mark disconnected, allow reconnect
      player.connected = false
      this.addLog(`${player.name} disconnected`)

      // Start cleanup timer if all players disconnect
      const anyConnected = Object.values(this.state.players).some(p => p.connected)
      if (!anyConnected) {
        this.scheduleCleanup()
      }
    }

    this.broadcast()
  }

  isEmpty(): boolean {
    return Object.keys(this.state.players).length === 0
  }

  // ─── Message routing ──────────────────────────────────────────────────────

  handleMessage(socketId: string, type: string, data: unknown) {
    const player = this.state.players[socketId]
    if (!player) return
    const d = data as Record<string, unknown>

    switch (type) {
      case "set_name":
        player.name = (String(d.name || "")).slice(0, 20)
        break

      case "set_color": {
        const colorIndex = Number(d.colorIndex ?? -1)
        // Release old color
        if (player.colorIndex >= 0) {
          this.state.takenColors = this.state.takenColors.filter(c => c !== player.colorIndex)
        }
        // Claim new color if available
        if (!this.state.takenColors.includes(colorIndex)) {
          player.colorIndex = colorIndex
          this.state.takenColors.push(colorIndex)
        }
        break
      }

      case "set_playmat":
        player.playmatUrl = String(d.url || "")
        break

      case "paste_deck":
        this.parseDeck(player, String(d.deckText || ""))
        break

      case "ready":
        if (player.library.length > 0 && player.colorIndex >= 0) {
          player.ready = true
          this.addLog(`${player.name} is ready`)
        }
        break

      case "unready":
        player.ready = false
        break

      case "start_game":
        if (socketId !== this.state.hostId) return
        if (!this.canStartGame()) return
        this.startGame()
        return // startGame broadcasts internally

      case "move_card":
        this.moveCard(player, {
          iid: String(d.iid || ""),
          toZone: String(d.toZone || ""),
          x: d.x !== undefined ? Number(d.x) : undefined,
          y: d.y !== undefined ? Number(d.y) : undefined,
          index: d.index !== undefined ? Number(d.index) : undefined,
        })
        break

      case "tap_card":
        this.setCardTapped(player, String(d.iid || ""), true)
        break

      case "untap_card":
        this.setCardTapped(player, String(d.iid || ""), false)
        break

      case "flip_card":
        this.flipCard(player, String(d.iid || ""))
        break

      case "add_counter":
        this.addCounter(player, String(d.iid || ""), Number(d.delta || 0))
        break

      case "draw_cards":
        this.drawCards(player, Number(d.count || 1))
        break

      case "mill_cards":
        this.millCards(player, Number(d.count || 1))
        break

      case "shuffle_library":
        this.shuffleLibrary(player)
        break

      case "change_life": {
        const delta = Number(d.delta || 0)
        player.life += delta
        this.addLog(`${player.name} life: ${player.life - delta} → ${player.life}`)
        break
      }

      case "change_poison":
        player.poison += Number(d.delta || 0)
        this.addLog(`${player.name} poison: ${player.poison}`)
        break

      case "pass_turn":
        this.passTurn()
        return // passTurn broadcasts internally

      case "untap_all":
        this.untapAll(player)
        break

      default:
        console.warn(`[GameRoom] Unknown message type: ${type}`)
        return
    }

    this.broadcast()
  }

  // ─── Game logic ───────────────────────────────────────────────────────────

  private parseDeck(player: PlayerState, deckText: string) {
    player.deckText = deckText
    player.library = []
    player.hand = []
    player.commandZone = []

    const lines = deckText.split("\n").filter(l => l.trim())

    for (const line of lines) {
      const match = line.match(/^(\d+)x?\s+(.+)$/i)
      if (!match) continue

      const count = parseInt(match[1], 10)
      const cardName = match[2].trim()

      const isCommander = /\*cmdr\*/i.test(cardName)
      const cleanName = cardName.replace(/\*cmdr\*/gi, "").trim()

      for (let i = 0; i < count; i++) {
        const card: CardState = {
          iid: uid(),
          cardId: cleanName,
          x: 0,
          y: 0,
          tapped: false,
          faceDown: false,
          counters: 0,
          zone: isCommander ? "commandZone" : "library",
        }

        if (isCommander) {
          player.commandZone.push(card)
        } else {
          player.library.push(card)
        }
      }
    }

    player.library = shuffle(player.library)
    this.addLog(`${player.name} loaded deck (${player.library.length + player.commandZone.length} cards)`)
  }

  private canStartGame(): boolean {
    const players = Object.values(this.state.players)
    return players.length >= 2 && players.every(p => p.ready)
  }

  private startGame() {
    this.state.phase = "playing"
    this.state.turn = 0
    this.state.round = 1

    // Initialize commander damage tracking
    const playerIds = Object.keys(this.state.players)
    for (const player of Object.values(this.state.players)) {
      for (const otherId of playerIds) {
        if (otherId !== player.odId) {
          player.cmdDamage[otherId] = { dealt: 0 }
        }
      }
    }

    // Draw opening hands
    for (const player of Object.values(this.state.players)) {
      this.drawCards(player, 7)
    }

    this.addLog("Game started!")
    const firstId = this.state.playerOrder[0]
    if (firstId) {
      const first = this.state.players[firstId]
      if (first) this.addLog(`${first.name}'s turn`)
    }

    this.broadcast()
  }

  private moveCard(player: PlayerState, payload: MoveCardPayload) {
    const { iid, toZone, x, y, index } = payload
    const zones: Array<keyof PlayerState> = [
      "battlefield", "hand", "library", "graveyard", "exile", "commandZone"
    ]

    let card: CardState | undefined
    let fromZone = ""

    for (const zoneName of zones) {
      const zone = player[zoneName] as CardState[]
      const idx = zone.findIndex(c => c.iid === iid)
      if (idx >= 0) {
        card = zone[idx]
        fromZone = zoneName
        zone.splice(idx, 1)
        break
      }
    }

    if (!card) return

    card.zone = toZone
    if (x !== undefined) card.x = x
    if (y !== undefined) card.y = y
    if (toZone !== "battlefield") card.tapped = false

    const destZone = player[toZone as keyof PlayerState] as CardState[]
    if (index !== undefined && index >= 0) {
      destZone.splice(index, 0, card)
    } else {
      destZone.push(card)
    }

    if (fromZone !== toZone) {
      this.addLog(`${player.name}: ${card.cardId} → ${toZone}`)
    }
  }

  private setCardTapped(player: PlayerState, iid: string, tapped: boolean) {
    const card = player.battlefield.find(c => c.iid === iid)
    if (card) card.tapped = tapped
  }

  private flipCard(player: PlayerState, iid: string) {
    for (const zoneName of ["battlefield", "hand"] as const) {
      const card = player[zoneName].find(c => c.iid === iid)
      if (card) {
        card.faceDown = !card.faceDown
        return
      }
    }
  }

  private addCounter(player: PlayerState, iid: string, delta: number) {
    const card = player.battlefield.find(c => c.iid === iid)
    if (card) card.counters = Math.max(0, card.counters + delta)
  }

  private drawCards(player: PlayerState, count: number) {
    let drawn = 0
    for (let i = 0; i < count && player.library.length > 0; i++) {
      const card = player.library.shift()
      if (card) {
        card.zone = "hand"
        player.hand.push(card)
        drawn++
      }
    }
    if (drawn > 0) this.addLog(`${player.name} drew ${drawn} card(s)`)
  }

  private millCards(player: PlayerState, count: number) {
    for (let i = 0; i < count && player.library.length > 0; i++) {
      const card = player.library.shift()
      if (card) {
        card.zone = "graveyard"
        player.graveyard.push(card)
      }
    }
    this.addLog(`${player.name} milled ${count} card(s)`)
  }

  private shuffleLibrary(player: PlayerState) {
    player.library = shuffle(player.library)
    this.addLog(`${player.name} shuffled their library`)
  }

  private untapAll(player: PlayerState) {
    for (const card of player.battlefield) card.tapped = false
    this.addLog(`${player.name} untapped all permanents`)
  }

  private passTurn() {
    const currentId = this.state.playerOrder[this.state.turn]
    const currentPlayer = currentId ? this.state.players[currentId] : undefined

    this.state.turn = (this.state.turn + 1) % this.state.playerOrder.length
    if (this.state.turn === 0) this.state.round++

    const nextId = this.state.playerOrder[this.state.turn]
    const nextPlayer = nextId ? this.state.players[nextId] : undefined

    if (currentPlayer && nextPlayer) {
      this.addLog(`${currentPlayer.name} passed turn to ${nextPlayer.name}`)
    }

    this.broadcast()
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  private addLog(message: string) {
    this.state.log.unshift(message)
    if (this.state.log.length > 100) this.state.log.pop()
  }

  broadcast() {
    this.io.to(this.roomId).emit("state_sync", this.state)
  }

  getState(): GameState {
    return this.state
  }

  getConnectedCount(): number {
    return Object.values(this.state.players).filter(p => p.connected).length
  }

  private scheduleCleanup() {
    if (this.cleanupTimer) return
    this.cleanupTimer = setTimeout(() => {
      console.log(`[GameRoom] Room ${this.roomId} timed out with no players`)
    }, 10 * 60 * 1000)
  }

  clearCleanupTimer() {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}
