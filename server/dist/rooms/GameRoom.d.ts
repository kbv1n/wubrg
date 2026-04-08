import { Room, Client } from "colyseus";
import { GameState, PlayerState, ClientMessage } from "../schema/GameState";
export declare class GameRoom extends Room<GameState> {
    maxClients: number;
    onCreate(options: {
        maxPlayers?: number;
    }): void;
    onJoin(client: Client, options: {
        name?: string;
    }): void;
    onLeave(client: Client, consented: boolean): void;
    handleMessage(client: Client, message: ClientMessage): void;
    parseDeck(player: PlayerState, deckText: string): void;
    canStartGame(): boolean;
    startGame(): void;
    moveCard(player: PlayerState, iid: string, toZone: string, x?: number, y?: number, index?: number): void;
    setCardTapped(player: PlayerState, iid: string, tapped: boolean): void;
    flipCard(player: PlayerState, iid: string): void;
    addCounter(player: PlayerState, iid: string, delta: number): void;
    drawCards(player: PlayerState, count: number): void;
    millCards(player: PlayerState, count: number): void;
    shuffleLibrary(player: PlayerState): void;
    untapAll(player: PlayerState): void;
    passTurn(): void;
    addLog(message: string): void;
}
//# sourceMappingURL=GameRoom.d.ts.map