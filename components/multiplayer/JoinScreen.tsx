"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Swords, Users, Link2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface JoinScreenProps {
  onCreateRoom: (name: string, maxPlayers: number) => Promise<void>
  onJoinRoom: (name: string, roomId: string) => Promise<void>
}

export function JoinScreen({ onCreateRoom, onJoinRoom }: JoinScreenProps) {
  const [name, setName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [mode, setMode] = useState<"select" | "create" | "join">("select")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Check URL for room code on mount
  useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const room = params.get("room")
      if (room) {
        setRoomCode(room)
        setMode("join")
      }
    }
  })

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter your name")
      return
    }
    setError("")
    setLoading(true)
    try {
      await onCreateRoom(name.trim(), maxPlayers)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room")
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!name.trim()) {
      setError("Please enter your name")
      return
    }
    if (!roomCode.trim()) {
      setError("Please enter a room code")
      return
    }
    setError("")
    setLoading(true)
    try {
      await onJoinRoom(name.trim(), roomCode.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Swords className="w-10 h-10 text-primary" />
          <h1 className="text-5xl font-black tracking-tight text-primary">
            AstralMagic
          </h1>
        </div>
        <p className="text-muted-foreground text-sm tracking-wider uppercase">
          Multiplayer Commander
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md liquid-glass-strong rounded-2xl p-8">
        {mode === "select" && (
          <>
            {/* Name Input */}
            <div className="mb-8">
              <Label htmlFor="name" className="text-sm font-medium text-foreground/80 mb-2 block">
                Your Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="h-12 text-lg bg-background/50 border-border/50 focus:border-primary"
                maxLength={20}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4">
              <Button
                onClick={() => setMode("create")}
                disabled={!name.trim()}
                className="h-14 text-lg font-bold bg-primary hover:bg-primary/90"
              >
                <Users className="w-5 h-5 mr-2" />
                Create Lobby
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              
              <Button
                onClick={() => setMode("join")}
                disabled={!name.trim()}
                variant="outline"
                className="h-14 text-lg font-semibold border-border/50 hover:bg-secondary"
              >
                <Link2 className="w-5 h-5 mr-2" />
                Join with Code
              </Button>
            </div>
          </>
        )}

        {mode === "create" && (
          <>
            <button 
              onClick={() => setMode("select")}
              className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1"
            >
              &larr; Back
            </button>
            
            <h2 className="text-xl font-bold mb-6">Create Lobby</h2>
            
            <div className="mb-6">
              <Label className="text-sm font-medium text-foreground/80 mb-3 block">
                Player Count
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setMaxPlayers(num)}
                    className={cn(
                      "h-12 rounded-lg font-bold text-lg transition-all",
                      maxPlayers === num
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-foreground/70 hover:bg-secondary"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={loading}
              className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Swords className="w-5 h-5 mr-2" />
                  Create Room
                </>
              )}
            </Button>
          </>
        )}

        {mode === "join" && (
          <>
            <button 
              onClick={() => setMode("select")}
              className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1"
            >
              &larr; Back
            </button>
            
            <h2 className="text-xl font-bold mb-6">Join Lobby</h2>
            
            <div className="mb-6">
              <Label htmlFor="roomCode" className="text-sm font-medium text-foreground/80 mb-2 block">
                Room Code
              </Label>
              <Input
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Enter room code..."
                className="h-12 text-lg font-mono bg-background/50 border-border/50 focus:border-primary"
              />
            </div>

            <Button
              onClick={handleJoin}
              disabled={loading || !roomCode.trim()}
              className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Link2 className="w-5 h-5 mr-2" />
                  Join Room
                </>
              )}
            </Button>
          </>
        )}

        {error && (
          <p className="mt-4 text-sm text-destructive text-center">{error}</p>
        )}
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground/60">
        Built for Commander players
      </p>
    </div>
  )
}
