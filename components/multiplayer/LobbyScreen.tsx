"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Swords, Copy, Check, Play, LogOut, Image as ImageIcon,
  ChevronDown, ChevronUp, ExternalLink, Link as LinkIcon, X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PlayerSlot } from "./PlayerSlot"
import { GameActions } from "@/lib/colyseus-client"
import type { GameState, PlayerState } from "@/lib/multiplayer-types"
import { PACKAGED_PLAYMATS, isPackagedPlaymat } from "@/lib/playmats"

const MOXFIELD_URL = "https://moxfield.com/decks/public?q=eyJmb3JtYXQiOiJjb21tYW5kZXJQcmVjb25zIn0%3D"

interface LobbyScreenProps {
  gameState: GameState
  localPlayerId: string
  onLeave: () => void
}

export function LobbyScreen({ gameState, localPlayerId, onLeave }: LobbyScreenProps) {
  const [deckText, setDeckText] = useState("")
  const [playmatUrl, setPlaymatUrl] = useState("")
  const [customUrl, setCustomUrl] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeckInput, setShowDeckInput] = useState(true)
  const [showPlaymatPicker, setShowPlaymatPicker] = useState(false)

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

  // Packaged playmat URLs already taken by OTHER players
  const takenPlaymats = new Set(
    players
      .filter(p => p.odId !== localPlayerId && isPackagedPlaymat(p.playmatUrl || ''))
      .map(p => p.playmatUrl || '')
  )

  const handleSelectPlaymat = (url: string) => {
    if (takenPlaymats.has(url)) return
    setPlaymatUrl(url)
    setShowCustomInput(false)
    GameActions.setPlaymat(url)
  }

  const handleSetCustomUrl = () => {
    const url = customUrl.trim()
    if (!url) return
    setPlaymatUrl(url)
    GameActions.setPlaymat(url)
    setShowCustomInput(false)
  }

  const handleClearPlaymat = () => {
    setPlaymatUrl('')
    setCustomUrl('')
    GameActions.setPlaymat('')
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
              <p className="text-xs text-muted-foreground">
                Room: <span className="font-mono select-all">{gameState.roomId}</span>
              </p>
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
                  Invite Link
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
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <button
                onClick={() => setShowDeckInput(!showDeckInput)}
                className="w-full flex items-center justify-between mb-3"
              >
                <h3 className="font-bold">Import Your Deck</h3>
                {showDeckInput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDeckInput && (
                <>
                  {/* Moxfield Link */}
                  <a
                    href={MOXFIELD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    <span>Browse Commander precon decks on Moxfield</span>
                  </a>

                  <p className="text-xs text-muted-foreground mb-2">
                    Paste your deck list below. Use the format: <code className="bg-muted px-1 rounded">1 Card Name</code>.
                    Add <code className="bg-muted px-1 rounded">*CMDR*</code> after commander names.
                  </p>

                  <Textarea
                    value={deckText}
                    onChange={(e) => setDeckText(e.target.value)}
                    placeholder={`1 Atraxa, Praetors' Voice *CMDR*\n1 Sol Ring\n1 Command Tower\n1 Llanowar Elves\n1 Swords to Plowshares\n...`}
                    className="min-h-[180px] max-h-[280px] font-mono text-sm bg-background/50 mb-3 resize-none overflow-y-auto break-all whitespace-pre-wrap"
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
                      Deck loaded: {localPlayer.library?.length || 0} cards
                      {(localPlayer.commandZone?.length || 0) > 0 && (
                        <> + {localPlayer.commandZone?.length} commander(s)</>
                      )}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Playmat Section */}
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <button
                onClick={() => setShowPlaymatPicker(!showPlaymatPicker)}
                className="w-full flex items-center justify-between mb-3"
              >
                <h3 className="font-bold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Choose Playmat
                </h3>
                {showPlaymatPicker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {/* Current selection preview */}
              {playmatUrl && (
                <div className="mb-3 flex items-center gap-3 p-2 rounded-lg bg-background/40 border border-border/30">
                  <div className="w-16 h-10 rounded overflow-hidden flex-shrink-0 border border-white/10">
                    <img
                      src={playmatUrl}
                      alt="Selected playmat"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground flex-1 truncate">
                    {isPackagedPlaymat(playmatUrl)
                      ? (PACKAGED_PLAYMATS.find(p => p.url === playmatUrl)?.name ?? 'Custom')
                      : 'Custom URL'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={handleClearPlaymat}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {showPlaymatPicker && (
                <>
                  {/* Packaged playmat grid */}
                  <div className="grid grid-cols-4 gap-2 mb-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {PACKAGED_PLAYMATS.map((mat) => {
                      const isSelected = playmatUrl === mat.url
                      const isTaken = takenPlaymats.has(mat.url)
                      return (
                        <button
                          key={mat.id}
                          disabled={isTaken}
                          onClick={() => handleSelectPlaymat(mat.url)}
                          className={cn(
                            "relative group flex flex-col items-center gap-1 rounded-lg p-1 border transition-all",
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : isTaken
                              ? "border-border/20 opacity-40 cursor-not-allowed"
                              : "border-border/30 hover:border-border/60 hover:bg-muted/50 cursor-pointer"
                          )}
                          title={isTaken ? `${mat.name} (taken)` : mat.name}
                        >
                          <div className="w-full aspect-video rounded overflow-hidden bg-muted">
                            <img
                              src={mat.thumb}
                              alt={mat.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[9px] text-center text-muted-foreground leading-tight line-clamp-1 w-full">
                            {mat.name}
                          </span>
                          {isTaken && (
                            <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-background/40">
                              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wide">Taken</span>
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-2 h-2 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Custom URL toggle */}
                  {!showCustomInput ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs gap-2 text-muted-foreground"
                      onClick={() => setShowCustomInput(true)}
                    >
                      <LinkIcon className="w-3 h-3" />
                      Use custom URL instead
                    </Button>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <Input
                        id="custom-playmat-url"
                        name="custom-playmat-url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSetCustomUrl(); if (e.key === 'Escape') setShowCustomInput(false) }}
                        placeholder="https://example.com/playmat.jpg"
                        className="flex-1 h-8 text-xs bg-background/50"
                        autoFocus
                      />
                      <Button size="sm" className="h-8 text-xs" onClick={handleSetCustomUrl} disabled={!customUrl.trim()}>
                        Set
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowCustomInput(false)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </>
              )}
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
                    "Select a color and load a deck to ready up"
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
