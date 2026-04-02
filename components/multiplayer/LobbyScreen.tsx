"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Swords, Copy, Check, Play, LogOut, Image as ImageIcon,
  ChevronDown, ChevronUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PlayerSlot } from "./PlayerSlot"
import { GameActions } from "@/lib/colyseus-client"
import type { GameState, PlayerState } from "@/lib/multiplayer-types"

interface LobbyScreenProps {
  gameState: GameState
  localPlayerId: string
  onLeave: () => void
}

export function LobbyScreen({ gameState, localPlayerId, onLeave }: LobbyScreenProps) {
  const [deckText, setDeckText] = useState("")
  const [playmatUrl, setPlaymatUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [showDeckInput, setShowDeckInput] = useState(true)
  
  const localPlayer = gameState.players.get(localPlayerId)
  const isHost = gameState.hostId === localPlayerId
  const players = Array.from(gameState.players.values())
    .sort((a, b) => a.pid - b.pid)
  
  const allReady = players.length >= 2 && players.every(p => p.ready)
  const canReady = localPlayer && 
    localPlayer.colorIndex >= 0 && 
    (localPlayer.library?.length || 0) > 0

  // Generate shareable link
  const shareLink = typeof window !== "undefined" 
    ? `${window.location.origin}?room=${gameState.roomId}`
    : ""

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handlePasteDeck = () => {
    if (deckText.trim()) {
      GameActions.pasteDeck(deckText.trim())
    }
  }

  const handleSetPlaymat = () => {
    if (playmatUrl.trim()) {
      GameActions.setPlaymat(playmatUrl.trim())
    }
  }

  const handleToggleReady = () => {
    if (localPlayer?.ready) {
      GameActions.unready()
    } else {
      GameActions.ready()
    }
  }

  const handleStartGame = () => {
    if (isHost && allReady) {
      GameActions.startGame()
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Swords className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-primary">AstralMagic</h1>
              <p className="text-xs text-muted-foreground">Lobby: {gameState.roomId}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Copy Link Button */}
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-primary" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </Button>
            
            {/* Leave Button */}
            <Button
              onClick={onLeave}
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto grid gap-6 lg:grid-cols-2">
          {/* Left Column - Player List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                Players ({players.length}/{gameState.maxPlayers})
              </h2>
              <span className="text-sm text-muted-foreground">
                {players.filter(p => p.ready).length} ready
              </span>
            </div>

            <div className="space-y-3">
              {players.map((player) => (
                <PlayerSlot
                  key={player.odId}
                  player={player}
                  isHost={player.odId === gameState.hostId}
                  isLocal={player.odId === localPlayerId}
                  takenColors={gameState.takenColors}
                  onColorChange={player.odId === localPlayerId ? GameActions.setColor : undefined}
                />
              ))}
              
              {/* Empty Slots */}
              {Array.from({ length: gameState.maxPlayers - players.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-4 rounded-xl border border-dashed border-border/30 text-center"
                >
                  <p className="text-sm text-muted-foreground/50">Waiting for player...</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Deck & Settings */}
          <div className="space-y-4">
            {/* Deck Input Section */}
            <div className="liquid-glass-strong rounded-xl p-4">
              <button 
                onClick={() => setShowDeckInput(!showDeckInput)}
                className="w-full flex items-center justify-between mb-3"
              >
                <h3 className="font-bold">Load Your Deck</h3>
                {showDeckInput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showDeckInput && (
                <>
                  <Textarea
                    value={deckText}
                    onChange={(e) => setDeckText(e.target.value)}
                    placeholder={`Paste your deck list here...\n\nFormat:\n1 Sol Ring\n1 Command Tower\n1 Llanowar Elves *CMDR*`}
                    className="min-h-[200px] font-mono text-sm bg-background/50 mb-3"
                  />
                  <Button
                    onClick={handlePasteDeck}
                    disabled={!deckText.trim()}
                    className="w-full"
                  >
                    Load Deck
                  </Button>
                  
                  {localPlayer && (localPlayer.library?.length || 0) > 0 && (
                    <p className="text-sm text-primary mt-2 text-center">
                      Deck loaded: {localPlayer.library?.length || 0} cards + {localPlayer.commandZone?.length || 0} commander(s)
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Playmat Section */}
            <div className="liquid-glass rounded-xl p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Custom Playmat (Optional)
              </h3>
              <div className="flex gap-2">
                <Input
                  value={playmatUrl}
                  onChange={(e) => setPlaymatUrl(e.target.value)}
                  placeholder="https://example.com/playmat.jpg"
                  className="flex-1 bg-background/50"
                />
                <Button
                  onClick={handleSetPlaymat}
                  disabled={!playmatUrl.trim()}
                  variant="secondary"
                >
                  Set
                </Button>
              </div>
            </div>

            {/* Ready / Start Section */}
            <div className="space-y-3">
              {!localPlayer?.ready ? (
                <Button
                  onClick={handleToggleReady}
                  disabled={!canReady}
                  className={cn(
                    "w-full h-14 text-lg font-bold",
                    canReady ? "bg-primary hover:bg-primary/90" : "bg-muted"
                  )}
                >
                  {canReady ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Ready Up
                    </>
                  ) : (
                    "Select color and load deck to ready"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleToggleReady}
                  variant="outline"
                  className="w-full h-14 text-lg font-semibold border-primary text-primary"
                >
                  Cancel Ready
                </Button>
              )}

              {isHost && (
                <Button
                  onClick={handleStartGame}
                  disabled={!allReady}
                  className={cn(
                    "w-full h-14 text-lg font-bold",
                    allReady 
                      ? "bg-[#fb8f23] hover:bg-[#fb8f23]/90 text-white" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Play className="w-5 h-5 mr-2" />
                  {allReady ? "Start Game" : `Waiting for ${players.filter(p => !p.ready).length} player(s)...`}
                </Button>
              )}

              {!isHost && allReady && (
                <p className="text-center text-sm text-muted-foreground">
                  Waiting for host to start the game...
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Game Log */}
      {gameState.log.length > 0 && (
        <footer className="border-t border-border/50 p-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs text-muted-foreground mb-2">Recent Activity</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {gameState.log.slice(0, 5).map((msg, i) => (
                <span key={i} className="text-xs text-foreground/70 whitespace-nowrap px-2 py-1 bg-muted rounded">
                  {msg}
                </span>
              ))}
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
