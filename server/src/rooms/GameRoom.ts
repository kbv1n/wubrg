import { Room, Client } from "colyseus"
import { ArraySchema } from "@colyseus/schema"
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
        if (newHost) {
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
  }
  
  handleMessage(client: Client, message: ClientMessage) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return
    
    switch (message.type) {
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
    }
  }
  
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
    const cards = [...player.library]
    player.library.clear()
    for (const card of shuffle(cards)) {
      if (card) player.library.push(card)
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
    
    // Draw opening hands (7 cards each)
    for (const player of this.state.players.values()) {
      this.drawCards(player, 7)
    }
    
    this.addLog("Game started!")
    const firstPlayerId = this.state.playerOrder[0]
    const firstPlayer = firstPlayerId ? this.state.players.get(firstPlayerId) : undefined
    if (firstPlayer) {
      this.addLog(`${firstPlayer.name}'s turn`)
    }
  }
  
  moveCard(player: PlayerState, iid: string, toZone: string, x?: number, y?: number, index?: number) {
    // Find card in any zone
    const zones = ["battlefield", "hand", "library", "graveyard", "exile", "commandZone"] as const
    let card: CardState | null = null
    let fromZone: string = ""
    
    for (const zoneName of zones) {
      const zone = player[zoneName] as ArraySchema<CardState>
      const idx = zone.toArray().findIndex(c => c.iid === iid)
      if (idx >= 0) {
        card = zone[idx] ?? null
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
      this.addLog(`${player.name}: ${card.cardId} -> ${toZone}`)
    }
  }
  
  setCardTapped(player: PlayerState, iid: string, tapped: boolean) {
    const card = player.battlefield.find(c => c.iid === iid)
    if (card) {
      card.tapped = tapped
    }
  }
  
  flipCard(player: PlayerState, iid: string) {
    const zones = ["battlefield", "hand"] as const
    for (const zoneName of zones) {
      const zone = player[zoneName] as ArraySchema<CardState>
      const card = zone.find(c => c.iid === iid)
      if (card) {
        card.faceDown = !card.faceDown
        return
      }
    }
  }
  
  addCounter(player: PlayerState, iid: string, delta: number) {
    const card = player.battlefield.find(c => c.iid === iid)
    if (card) {
      card.counters = Math.max(0, card.counters + delta)
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
    const cards = [...player.library]
    player.library.clear()
    for (const card of shuffle(cards)) {
      if (card) player.library.push(card)
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
    const currentPlayer = currentPlayerId ? this.state.players.get(currentPlayerId) : undefined

    // Move to next player
    this.state.turn = (this.state.turn + 1) % this.state.playerOrder.length

    // Check for new round
    if (this.state.turn === 0) {
      this.state.round++
    }

    const nextPlayerId = this.state.playerOrder[this.state.turn]
    const nextPlayer = nextPlayerId ? this.state.players.get(nextPlayerId) : undefined
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
