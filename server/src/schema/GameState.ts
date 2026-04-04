import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema"

// Card instance state - mirrors frontend CardInstance
export class CardState extends Schema {
  @type("string") iid: string = ""
  @type("string") cardId: string = ""
  @type("number") x: number = 0
  @type("number") y: number = 0
  @type("boolean") tapped: boolean = false
  @type("boolean") faceDown: boolean = false
  @type("number") counters: number = 0
  @type("string") zone: string = "library"
}

// Commander damage tracking
export class CommanderDamage extends Schema {
  @type("number") dealt: number = 0
}

// Player state - mirrors frontend Player
export class PlayerState extends Schema {
  @type("string") odId: string = ""  // Session ID / client ID
  @type("string") name: string = ""
  @type("number") pid: number = 0
  @type("number") life: number = 40
  @type("number") poison: number = 0
  @type("number") colorIndex: number = -1
  @type("string") playmatUrl: string = ""
  @type("boolean") ready: boolean = false
  @type("boolean") connected: boolean = true
  @type("string") deckText: string = ""
  
  // Card zones
  @type([CardState]) battlefield = new ArraySchema<CardState>()
  @type([CardState]) hand = new ArraySchema<CardState>()
  @type([CardState]) library = new ArraySchema<CardState>()
  @type([CardState]) graveyard = new ArraySchema<CardState>()
  @type([CardState]) exile = new ArraySchema<CardState>()
  @type([CardState]) commandZone = new ArraySchema<CardState>()
  
  // Commander damage from each other player
  @type({ map: CommanderDamage }) cmdDamage = new MapSchema<CommanderDamage>()
}

// Main game state
export class GameState extends Schema {
  // Game phase: "lobby" | "commander-select" | "playing" | "ended"
  @type("string") phase: string = "lobby"
  
  // Room info
  @type("string") roomId: string = ""
  @type("string") hostId: string = ""
  @type("number") maxPlayers: number = 4
  
  // Turn state
  @type("number") turn: number = 0  // Index of active player
  @type("number") round: number = 1
  
  // Players map (keyed by session ID)
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>()
  
  // Track taken colors
  @type(["number"]) takenColors = new ArraySchema<number>()
  
  // Game log
  @type(["string"]) log = new ArraySchema<string>()
  
  // Player order (session IDs in turn order)
  @type(["string"]) playerOrder = new ArraySchema<string>()
}

// Message types for client -> server communication
export type ClientMessage = 
  | { type: "set_name"; name: string }
  | { type: "set_color"; colorIndex: number }
  | { type: "set_playmat"; url: string }
  | { type: "paste_deck"; deckText: string }
  | { type: "ready" }
  | { type: "unready" }
  | { type: "start_game" }
  | { type: "select_commander"; cardId: string }
  | { type: "move_card"; iid: string; toZone: string; x?: number; y?: number; index?: number }
  | { type: "tap_card"; iid: string }
  | { type: "untap_card"; iid: string }
  | { type: "flip_card"; iid: string }
  | { type: "add_counter"; iid: string; delta: number }
  | { type: "draw_cards"; count: number }
  | { type: "mill_cards"; count: number }
  | { type: "shuffle_library" }
  | { type: "change_life"; delta: number }
  | { type: "change_poison"; delta: number }
  | { type: "cmd_damage"; fromPid: number; delta: number }
  | { type: "pass_turn" }
  | { type: "untap_all" }
  | { type: "scry"; count: number }
  | { type: "reveal_top"; count: number }
  | { type: "create_token"; name: string; power: number; toughness: number }
