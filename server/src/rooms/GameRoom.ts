import { Room, Client } from "colyseus"
import { ArraySchema, MapSchema } from "@colyseus/schema"
import { GameState, PlayerState, CardState, CommanderDamage, ClientMessage } from "../schema/GameState"

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Generate unique ID
function uid(): string {
  return Math.random().toString(36).substring(2, 15)
}

export class GameRoom extends Room<GameState> {
  maxClients = 8

  onCreate(options: { maxPlayers?: number }) {
    this.setState(new GameState())
    this.state.roomId = this.roomId
    this.state.maxPlayers = options.maxPlayers || 4
    this.maxClients = this.state.maxPlayers

    // Register message handlers
    this.onMessage("*", (client, type, message) => {
      this.handleMessage(client, { type, ...message } as ClientMessage)
    })

    console.log(`[GameRoom] Created room ${this.roomId} for ${this.state.maxPlayers} players`)
  }

  onJoin(client: Client, options: { name?: string }) {
    // Check if room is full
    if (this.state.players.size >= this.state.maxPlayers) {
      throw new Error("Room is full")
    }

    // Check if game already started
    if (this.state.phase !== "lobby") {
      // Allow reconnection
      const existingPlayer = Array.from(this.state.players.values()).find(
        p => p.name === options.name && !p.connected
      )
      if (existingPlayer) {
        existingPlayer.odId = client.sessionId
        existingPlayer.connected = true
        this.addLog(`${existingPlayer.name} reconnected`)
        this.syncState()
        return
      }
      throw new Error("Game already in progress")
    }

    // Create new player
    const player = new PlayerState()
    player.odId = client.sessionId
    player.name = options.name || `Player ${this.state.players.size + 1}`
    player.pid = this.state.players.size
    player.connected = true

    // First player is host
    if (this.state.players.size === 0) {
      this.state.hostId = client.sessionId
    }

    // Add to player order
    this.state.playerOrder.push(client.sessionId)
    this.state.players.set(client.sessionId, player)

    this.addLog(`${player.name} joined the lobby`)
    console.log(`[GameRoom] ${player.name} joined (${client.sessionId})`)

    // Send full state to all clients as plain JSON
    this.syncState()
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    if (this.state.phase === "lobby") {
      // In lobby, remove player entirely
      const colorIdx = player.colorIndex
      if (colorIdx >= 0) {
        const idx = this.state.takenColors.indexOf(colorIdx)
        if (idx >= 0) this.state.takenColors.splice(idx, 1)
      }

      // Remove from player order
      const orderIdx = this.state.playerOrder.indexOf(client.sessionId)
      if (orderIdx >= 0) this.state.playerOrder.splice(orderIdx, 1)

      this.state.players.delete(client.sessionId)
      this.addLog(`${player.name} left the lobby`)

      // Reassign host if needed
      if (this.state.hostId === client.sessionId && this.state.players.size > 0) {
        const newHost = this.state.playerOrder[0]
        if (newHost !== undefined) {
          this.state.hostId = newHost
          const newHostPlayer = this.state.players.get(newHost)
          if (newHostPlayer) {
            this.addLog(`${newHostPlayer.name} is now the host`)
          }
        }
      }
    } else {
      // In game, mark disconnected but keep state
      player.connected = false
      this.addLog(`${player.name} disconnected`)

      // Allow reconnection for 5 minutes
      this.clock.setTimeout(() => {
        if (!player.connected) {
          this.addLog(`${player.name} timed out`)
        }
      }, 5 * 60 * 1000)
    }

    this.syncState()
  }

  handleMessage(client: Client, message: ClientMessage) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    switch (message.type) {
      case "request_state":
        // Send state to just this client
        client.send("state_sync", this.serializePlainState())
        return  // Don't broadcast, just respond to requester

      case "set_name":
        player.name = message.name.slice(0, 20)
        break

      case "set_color":
        // Release old color
        if (player.colorIndex >= 0) {
          const idx = this.state.takenColors.indexOf(player.colorIndex)
          if (idx >= 0) this.state.takenColors.splice(idx, 1)
        }
        // Claim new color if available
        if (!this.state.takenColors.includes(message.colorIndex)) {
          player.colorIndex = message.colorIndex
          this.state.takenColors.push(message.colorIndex)
        }
        break

      case "set_playmat":
        player.playmatUrl = message.url
        break

      case "log_action":
        if (message.msg && typeof message.msg === 'string') {
          this.addLog(message.msg)
        }
        break

      case "paste_deck":
        player.deckText = message.deckText
        // Parse deck and create cards
        this.parseDeck(player, message.deckText)
        break

      case "ready":
        // Must have deck to ready
        if (player.library.length > 0 && player.colorIndex >= 0) {
          player.ready = true
          this.addLog(`${player.name} is ready`)
        }
        break

      case "unready":
        player.ready = false
        break

      case "start_game":
        if (client.sessionId !== this.state.hostId) return
        if (!this.canStartGame()) return
        this.startGame()
        break

      case "move_card":
        this.moveCard(player, message.iid, message.toZone, message.x, message.y, message.index)
        break

      case "tap_card":
        this.setCardTapped(player, message.iid, true)
        break

      case "untap_card":
        this.setCardTapped(player, message.iid, false)
        break

      case "flip_card":
        this.flipCard(player, message.iid)
        break

      case "add_counter":
        this.addCounter(player, message.iid, message.delta)
        break

      case "draw_cards":
        this.drawCards(player, message.count)
        break

      case "mill_cards":
        this.millCards(player, message.count)
        break

      case "shuffle_library":
        this.shuffleLibrary(player)
        break

      case "change_life":
        player.life += message.delta
        this.addLog(`${player.name} life: ${player.life - message.delta} -> ${player.life}`)
        break

      case "change_poison":
        player.poison += message.delta
        this.addLog(`${player.name} poison: ${player.poison}`)
        break

      case "pass_turn":
        this.passTurn()
        break

      case "untap_all":
        this.untapAll(player)
        break

      case "cmd_damage": {
        // message.fromSessionId is the session ID of the attacking commander's owner
        // Apply damage to the receiving player (the message sender)
        const fromSid = message.fromSessionId
        if (fromSid) {
          const dmgEntry = player.cmdDamage.get(fromSid)
          if (dmgEntry) {
            dmgEntry.dealt = Math.max(0, dmgEntry.dealt + message.delta)
          }
          // Also reduce life
          player.life -= message.delta
          const fromPlayer = this.state.players.get(fromSid)
          this.addLog(`${player.name} took ${message.delta} commander dmg from ${fromPlayer?.name || '?'} (total: ${dmgEntry?.dealt || 0})`)
        }
        break
      }

      case "scry": {
        // Scry: client will handle reordering via move_card messages
        // Just log it
        this.addLog(`${player.name} is scrying ${message.count}`)
        break
      }

      case "create_token": {
        const token = new CardState()
        token.iid = uid()
        token.cardId = `${message.name} (${message.power}/${message.toughness})`
        token.zone = "battlefield"
        token.x = 30 + Math.random() * 30
        token.y = 20 + Math.random() * 30
        player.battlefield.push(token)
        this.addLog(`${player.name} created token: ${message.name} ${message.power}/${message.toughness}`)
        break
      }
    }

    // Broadcast updated state after every mutation
    this.syncState()
  }

  // ---- State Sync (plain JSON, bypasses schema serialization) ----

  syncState() {
    this.broadcast("state_sync", this.serializePlainState())
  }

  serializePlainState(): any {
    const players: Record<string, any> = {}
    this.state.players.forEach((player: PlayerState, id: string) => {
      players[id] = {
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
        battlefield: this.serializeCards(player.battlefield),
        hand: this.serializeCards(player.hand),
        library: this.serializeCards(player.library),
        graveyard: this.serializeCards(player.graveyard),
        exile: this.serializeCards(player.exile),
        commandZone: this.serializeCards(player.commandZone),
        cmdDamage: this.serializeCmdDamage(player.cmdDamage),
      }
    })

    const takenColors: number[] = []
    this.state.takenColors.forEach((c: number) => takenColors.push(c))

    const log: string[] = []
    this.state.log.forEach((l: string) => log.push(l))

    const playerOrder: string[] = []
    this.state.playerOrder.forEach((p: string) => playerOrder.push(p))

    return {
      phase: this.state.phase,
      roomId: this.state.roomId,
      hostId: this.state.hostId,
      maxPlayers: this.state.maxPlayers,
      turn: this.state.turn,
      round: this.state.round,
      players,
      takenColors,
      log,
      playerOrder,
    }
  }

  serializeCards(cards: ArraySchema<CardState>): any[] {
    const result: any[] = []
    cards.forEach((card: CardState) => {
      result.push({
        iid: card.iid,
        cardId: card.cardId,
        x: card.x,
        y: card.y,
        tapped: card.tapped,
        faceDown: card.faceDown,
        counters: card.counters,
        zone: card.zone,
      })
    })
    return result
  }

  serializeCmdDamage(cmdDamage: MapSchema<CommanderDamage>): Record<string, { dealt: number }> {
    const result: Record<string, { dealt: number }> = {}
    cmdDamage.forEach((val: CommanderDamage, key: string) => {
      result[key] = { dealt: val.dealt }
    })
    return result
  }

  // ---- Deck Parsing ----

  parseDeck(player: PlayerState, deckText: string) {
    // Clear existing deck
    player.library.clear()
    player.hand.clear()
    player.commandZone.clear()

    const lines = deckText.split("\n").filter(l => l.trim())

    for (const line of lines) {
      const match = line.match(/^(\d+)x?\s+(.+)$/i)
      if (!match) continue

      const count = parseInt(match[1], 10)
      const cardName = match[2].trim()

      // Check for commander marker
      const isCommander = cardName.toLowerCase().includes("*cmdr*") ||
                          cardName.toLowerCase().includes("commander")
      const cleanName = cardName.replace(/\*cmdr\*/gi, "").replace(/commander/gi, "").trim()

      for (let i = 0; i < count; i++) {
        const card = new CardState()
        card.iid = uid()
        card.cardId = cleanName
        card.zone = isCommander ? "commandZone" : "library"

        if (isCommander) {
          player.commandZone.push(card)
        } else {
          player.library.push(card)
        }
      }
    }

    // Shuffle library
    const cards: CardState[] = []
    player.library.forEach((c: CardState) => cards.push(c))
    player.library.clear()
    for (const card of shuffle(cards)) {
      player.library.push(card)
    }

    this.addLog(`${player.name} loaded deck (${player.library.length + player.commandZone.length} cards)`)
  }

  canStartGame(): boolean {
    if (this.state.players.size < 2) return false
    return Array.from(this.state.players.values()).every(p => p.ready)
  }

  startGame() {
    this.state.phase = "playing"
    this.state.turn = 0
    this.state.round = 1

    // Initialize commander damage tracking
    const playerIds = Array.from(this.state.players.keys())
    for (const player of this.state.players.values()) {
      for (const otherId of playerIds) {
        if (otherId !== player.odId) {
          player.cmdDamage.set(otherId, new CommanderDamage())
        }
      }
    }

    // Auto-assign packaged playmats to players who haven't selected one
    const PACKAGED_PLAYMAT_URLS = [
      '/textures/bonsai-ozgmx-drgl-lrg.webp',
      '/textures/bsktbll-org-drgl-xxl-drgl-thumb_1778590b-81f5-43b9-9bd8-54e11cb8c081.webp',
      '/textures/cstl1-org-drgl-xxl-drgl-thumb.jpg',
      '/textures/cstl7-org-drgl-xxl-drgl-thumb.jpg',
      '/textures/cwboy-org-drgl-xxl-drgl-thumb_72779e86-7133-4920-a286-bfdc318f9000.jpg',
      '/textures/drgnebula-org-drgl-xxl-drgl-thumb.webp',
      '/textures/drgwrath-org-stbl-xxl-stbl-thumb.jpg',
      '/textures/gulp-org-drgl-xxl-drgl-thumb.jpg',
      '/textures/hole-org-drgl-xxl-drgl-thumb.webp',
      '/textures/jeanleon-org-drgl-lrg.jpg',
      '/textures/landerspoint-org-drgl-lrg.jpg',
      '/textures/lildog-org-drgl-xxl-drgl-thumb.jpg',
      '/textures/map-purp-drgl-xxl-drgl-thumb.webp',
      '/textures/phaeton-org-drgl-lrg_c3422eda-a0ce-4716-a69d-05131c845fa7.jpg',
      '/textures/pless-org-drgl-lrg_8eedb66d-7965-4cd8-a187-9a1960f549e6.jpg',
      '/textures/satomitgr-org-drgl-xxl-drgl-thumb.webp',
      '/textures/scrltpwr-org-drgl-xxl-drgl-thumb_6a2a147b-9626-456e-b9d4-22fe8ed2ac89.jpg',
      '/textures/snvda-org-drgl-xxl-drgl-thumb.jpg',
      '/textures/strcr-bgr-drgl-xxl-drgl-thumb.jpg',
      '/textures/strcr-red-aero-lrg-aero-thumb.jpg',
      '/textures/strcr-ver-drgl-xxl-drgl-thumb.jpg',
      '/textures/strge-orn-drgl-xxl-drgl-thumb.jpg',
      '/textures/strst-brw-drgl-xxl-drgl-thumb.jpg',
      '/textures/strst-grn-drgl-xxl-drgl-thumb_2b2eca77-4145-460a-bbf5-4e08e493566d.jpg',
      '/textures/theten-bw-drgl-lrg.jpg',
      '/textures/unnamedfrench-org-drgl-lrg_7470c323-7b82-4f9e-a742-19e0ed29cd83.jpg',
    ]
    const packagedSet = new Set(PACKAGED_PLAYMAT_URLS)
    const usedMats = new Set<string>()
    // First pass: record already-chosen packaged mats
    for (const player of this.state.players.values()) {
      if (player.playmatUrl && packagedSet.has(player.playmatUrl)) {
        usedMats.add(player.playmatUrl)
      }
    }
    // Shuffle the available pool
    const availableMats = PACKAGED_PLAYMAT_URLS.filter(u => !usedMats.has(u))
    for (let i = availableMats.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableMats[i], availableMats[j]] = [availableMats[j], availableMats[i]]
    }
    let matIdx = 0
    // Second pass: assign to players who don't have one
    for (const player of this.state.players.values()) {
      if (!player.playmatUrl && matIdx < availableMats.length) {
        player.playmatUrl = availableMats[matIdx++]
      }
    }

    // Draw opening hands (7 cards each)
    for (const player of this.state.players.values()) {
      this.drawCards(player, 7)
    }

    this.addLog("Game started!")
    const firstPlayerId = this.state.playerOrder[0]
    if (firstPlayerId !== undefined) {
      const firstPlayer = this.state.players.get(firstPlayerId)
      if (firstPlayer) {
        this.addLog(`${firstPlayer.name}'s turn`)
      }
    }
  }

  moveCard(player: PlayerState, iid: string, toZone: string, x?: number, y?: number, index?: number) {
    // Find card in any zone
    const zones = ["battlefield", "hand", "library", "graveyard", "exile", "commandZone"] as const
    let card: CardState | undefined = undefined
    let fromZone: string = ""

    for (const zoneName of zones) {
      const zone = player[zoneName] as ArraySchema<CardState>
      const cardsArray = zone.toArray()
      const idx = cardsArray.findIndex(c => c.iid === iid)
      if (idx >= 0) {
        card = cardsArray[idx]
        fromZone = zoneName
        zone.splice(idx, 1)
        break
      }
    }

    if (!card) return

    // Update card state
    card.zone = toZone
    if (x !== undefined) card.x = x
    if (y !== undefined) card.y = y
    if (toZone !== "battlefield") {
      card.tapped = false
    }

    // Add to destination zone
    const destZone = player[toZone as keyof PlayerState] as ArraySchema<CardState>
    if (index !== undefined && index >= 0) {
      destZone.splice(index, 0, card)
    } else {
      destZone.push(card)
    }

    if (fromZone !== toZone) {
      this.addLog(`${player.name} moved ${card.cardId} from ${fromZone} to ${toZone}`)
    }
  }

  setCardTapped(player: PlayerState, iid: string, tapped: boolean) {
    const card = player.battlefield.find(c => c.iid === iid)
    if (card) {
      card.tapped = tapped
      this.addLog(`${player.name} ${tapped ? 'tapped' : 'untapped'} ${card.cardId}`)
    }
  }

  flipCard(player: PlayerState, iid: string) {
    const zones = ["battlefield", "hand"] as const
    for (const zoneName of zones) {
      const zone = player[zoneName] as ArraySchema<CardState>
      const card = zone.find(c => c.iid === iid)
      if (card) {
        card.faceDown = !card.faceDown
        this.addLog(`${player.name} flipped ${card.cardId} face ${card.faceDown ? 'down' : 'up'}`)
        return
      }
    }
  }

  addCounter(player: PlayerState, iid: string, delta: number) {
    const card = player.battlefield.find(c => c.iid === iid)
    if (card) {
      card.counters = Math.max(0, card.counters + delta)
      this.addLog(`${player.name} ${delta > 0 ? 'added' : 'removed'} counter on ${card.cardId} (${card.counters})`)
    }
  }

  drawCards(player: PlayerState, count: number) {
    const drawn: string[] = []
    for (let i = 0; i < count && player.library.length > 0; i++) {
      const card = player.library.shift()
      if (card) {
        card.zone = "hand"
        player.hand.push(card)
        drawn.push(card.cardId)
      }
    }
    if (drawn.length > 0) {
      this.addLog(`${player.name} drew ${drawn.length} card(s)`)
    }
  }

  millCards(player: PlayerState, count: number) {
    for (let i = 0; i < count && player.library.length > 0; i++) {
      const card = player.library.shift()
      if (card) {
        card.zone = "graveyard"
        player.graveyard.push(card)
      }
    }
    this.addLog(`${player.name} milled ${count} card(s)`)
  }

  shuffleLibrary(player: PlayerState) {
    const cards: CardState[] = []
    player.library.forEach((c: CardState) => cards.push(c))
    player.library.clear()
    for (const card of shuffle(cards)) {
      player.library.push(card)
    }
    this.addLog(`${player.name} shuffled their library`)
  }

  untapAll(player: PlayerState) {
    for (const card of player.battlefield) {
      card.tapped = false
    }
    this.addLog(`${player.name} untapped all permanents`)
  }

  passTurn() {
    const currentPlayerId = this.state.playerOrder[this.state.turn]
    const currentPlayer = currentPlayerId !== undefined ? this.state.players.get(currentPlayerId) : undefined

    // Move to next player
    this.state.turn = (this.state.turn + 1) % this.state.playerOrder.length

    // Check for new round
    if (this.state.turn === 0) {
      this.state.round++
    }

    const nextPlayerId = this.state.playerOrder[this.state.turn]
    const nextPlayer = nextPlayerId !== undefined ? this.state.players.get(nextPlayerId) : undefined
    if (currentPlayer && nextPlayer) {
      this.addLog(`${currentPlayer.name} passed turn to ${nextPlayer.name}`)
    }
  }

  addLog(message: string) {
    this.state.log.unshift(message)
    // Keep last 100 entries
    while (this.state.log.length > 100) {
      this.state.log.pop()
    }
  }
}
