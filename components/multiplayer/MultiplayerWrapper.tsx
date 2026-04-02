"use client"

import { useState, useEffect, useCallback } from "react"
import { Room } from "colyseus.js"
import { JoinScreen } from "./JoinScreen"
import { LobbyScreen } from "./LobbyScreen"
import { 
  createRoom, 
  joinRoom, 
  leaveRoom, 
  getCurrentRoom,
  setCurrentRoom,
  schemaToGameState 
} from "@/lib/colyseus-client"
import type { GameState } from "@/lib/multiplayer-types"

interface MultiplayerWrapperProps {
  children: (props: {
    gameState: GameState
    localPlayerId: string
    isMultiplayer: true
  }) => React.ReactNode
  onSinglePlayer: () => void
}

type ConnectionState = "disconnected" | "connecting" | "lobby" | "playing"

export function MultiplayerWrapper({ children, onSinglePlayer }: MultiplayerWrapperProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [localPlayerId, setLocalPlayerId] = useState<string>("")
  const [error, setError] = useState<string>("")

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom()
    }
  }, [])

  // Setup room listeners
  const setupRoomListeners = useCallback((room: Room) => {
    setLocalPlayerId(room.sessionId)
    
    // Initial state
    room.onStateChange.once((state) => {
      const gs = schemaToGameState(state)
      setGameState(gs)
      setConnectionState(gs.phase === "lobby" ? "lobby" : "playing")
    })

    // State updates
    room.onStateChange((state) => {
      const gs = schemaToGameState(state)
      setGameState(gs)
      
      // Transition to playing when game starts
      if (gs.phase === "playing" && connectionState !== "playing") {
        setConnectionState("playing")
      }
    })

    // Handle disconnect
    room.onLeave((code) => {
      console.log("[Colyseus] Left room with code:", code)
      setCurrentRoom(null)
      if (code !== 1000) {
        // Abnormal disconnect
        setError("Disconnected from server")
        setConnectionState("disconnected")
      }
    })

    // Handle errors
    room.onError((code, message) => {
      console.error("[Colyseus] Room error:", code, message)
      setError(message || "Connection error")
    })
  }, [connectionState])

  // Create a new room
  const handleCreateRoom = async (name: string, maxPlayers: number) => {
    setError("")
    setConnectionState("connecting")
    try {
      const room = await createRoom(name, maxPlayers)
      setupRoomListeners(room)
    } catch (err) {
      console.error("[Colyseus] Create room error:", err)
      setError(err instanceof Error ? err.message : "Failed to create room")
      setConnectionState("disconnected")
      throw err
    }
  }

  // Join an existing room
  const handleJoinRoom = async (name: string, roomId: string) => {
    setError("")
    setConnectionState("connecting")
    try {
      const room = await joinRoom(roomId, name)
      setupRoomListeners(room)
    } catch (err) {
      console.error("[Colyseus] Join room error:", err)
      setError(err instanceof Error ? err.message : "Failed to join room")
      setConnectionState("disconnected")
      throw err
    }
  }

  // Leave current room
  const handleLeave = async () => {
    await leaveRoom()
    setGameState(null)
    setLocalPlayerId("")
    setConnectionState("disconnected")
    // Clear room code from URL
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname)
    }
  }

  // Render based on connection state
  if (connectionState === "disconnected" || connectionState === "connecting") {
    return (
      <JoinScreen
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />
    )
  }

  if (connectionState === "lobby" && gameState) {
    return (
      <LobbyScreen
        gameState={gameState}
        localPlayerId={localPlayerId}
        onLeave={handleLeave}
      />
    )
  }

  if (connectionState === "playing" && gameState) {
    return (
      <>
        {children({
          gameState,
          localPlayerId,
          isMultiplayer: true
        })}
      </>
    )
  }

  // Loading state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Connecting...</p>
        {error && <p className="text-destructive text-sm mt-2">{error}</p>}
      </div>
    </div>
  )
}
