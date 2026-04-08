import { Schema, MapSchema, ArraySchema } from "@colyseus/schema";
export declare class CardState extends Schema {
    iid: string;
    cardId: string;
    x: number;
    y: number;
    tapped: boolean;
    faceDown: boolean;
    counters: number;
    zone: string;
}
export declare class CommanderDamage extends Schema {
    dealt: number;
}
export declare class PlayerState extends Schema {
    odId: string;
    name: string;
    pid: number;
    life: number;
    poison: number;
    colorIndex: number;
    playmatUrl: string;
    ready: boolean;
    connected: boolean;
    deckText: string;
    battlefield: ArraySchema<CardState>;
    hand: ArraySchema<CardState>;
    library: ArraySchema<CardState>;
    graveyard: ArraySchema<CardState>;
    exile: ArraySchema<CardState>;
    commandZone: ArraySchema<CardState>;
    cmdDamage: MapSchema<CommanderDamage, string>;
}
export declare class GameState extends Schema {
    phase: string;
    roomId: string;
    hostId: string;
    maxPlayers: number;
    turn: number;
    round: number;
    players: MapSchema<PlayerState, string>;
    takenColors: ArraySchema<number>;
    log: ArraySchema<string>;
    playerOrder: ArraySchema<string>;
}
export type ClientMessage = {
    type: "set_name";
    name: string;
} | {
    type: "set_color";
    colorIndex: number;
} | {
    type: "set_playmat";
    url: string;
} | {
    type: "paste_deck";
    deckText: string;
} | {
    type: "ready";
} | {
    type: "unready";
} | {
    type: "start_game";
} | {
    type: "select_commander";
    cardId: string;
} | {
    type: "move_card";
    iid: string;
    toZone: string;
    x?: number;
    y?: number;
    index?: number;
} | {
    type: "tap_card";
    iid: string;
} | {
    type: "untap_card";
    iid: string;
} | {
    type: "flip_card";
    iid: string;
} | {
    type: "add_counter";
    iid: string;
    delta: number;
} | {
    type: "draw_cards";
    count: number;
} | {
    type: "mill_cards";
    count: number;
} | {
    type: "shuffle_library";
} | {
    type: "change_life";
    delta: number;
} | {
    type: "change_poison";
    delta: number;
} | {
    type: "cmd_damage";
    fromPid: number;
    delta: number;
} | {
    type: "pass_turn";
} | {
    type: "untap_all";
} | {
    type: "scry";
    count: number;
} | {
    type: "reveal_top";
    count: number;
} | {
    type: "create_token";
    name: string;
    power: number;
    toughness: number;
};
//# sourceMappingURL=GameState.d.ts.map