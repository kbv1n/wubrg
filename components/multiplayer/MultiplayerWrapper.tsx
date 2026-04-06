"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Room } from "colyseus.js"
import { LobbyScreen } from "./LobbyScreen"
import {
  createRoom,
  joinRoom,
  leaveRoom,
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
  onBack: () => void
  initialAction?: { type: 'create'; maxPlayers: number } | { type: 'join'; roomCode: string } | null
}

type ConnectionState = "disconnected" | "connecting" | "lobby" | "playing"

export function MultiplayerWrapper({ children, onBack, initialAction }: MultiplayerWrapperProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [localPlayerId, setLocalPlayerId] = useState<string>("")
  const [error, setError] = useState<string>("")
  const hasTriedInitialAction = useRef(false)

  const setupRoomListeners = useCallback((room: Room) => {
    setLocalPlayerId(room.sessionId)

    room.onStateChange.once((state) => {
      const gs = schemaToGameState(state)
      setGameState(gs)
      setConnectionState(gs.phase === "lobby" ? "lobby" : "playing")
    })

    room.onStateChange((state) => {
      const gs = schemaToGameState(state)
      setGameState(gs)
      if (gs.phase === "playing") {
        setConnectionState("playing")
      }
    })

    room.onLeave((code) => {
      console.log("[Colyseus] Left room with code:", code)
      setCurrentRoom(null)
      if (code !== 1000) {
        setError("Disconnected from server")
        setConnectionState("disconnected")
      }
    })

    room.onError((code, message) => {
      console.error("[Colyseus] Room error:", code, message)
      setError(message || "Connection error")
    })
  }, [])

  const formatConnectionError = (err: unknown): string => {
    if (err && typeof err === 'object' && 'type' in err) {
      return "Cannot connect to game server"
    }
    if (err instanceof Error) return err.message
    return "Connection failed"
  }

  const handleCreateRoom = useCallback(async (name: string, maxPlayers: number) => {
    setError("")
    setConnectionState("connecting")
    try {
      const room = await createRoom(name, maxPlayers)
      setupRoomListeners(room)
    } catch (err) {
      console.error("[Colyseus] Create room error:", err)
      setError(formatConnectionError(err))
      setConnectionState("disconnected")
      throw err
    }
  }, [setupRoomListeners])

  const handleJoinRoom = useCallback(async (name: string, roomId: string) => {
    setError("")
    setConnectionState("connecting")
    try {
      const room = await joinRoom(roomId, name)
      setupRoomListeners(room)
    } catch (err) {
      console.error("[Colyseus] Join room error:", err)
      setError(formatConnectionError(err))
      setConnectionState("disconnected")
      throw err
    }
  }, [setupRoomListeners])

  const handleLeave = async () => {
    await leaveRoom()
    setGameState(null)
    setLocalPlayerId("")
    setConnectionState("disconnected")
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname)
    }
    onBack()
  }

  // Auto-connect based on initialAction from the select screen
  useEffect(() => {
    if (!initialAction || hasTriedInitialAction.current || connectionState !== "disconnected") return
    hasTriedInitialAction.current = true
    // Pass empty name — server will assign "Player 1", "Player 2", etc.
    if (initialAction.type === 'create') {
      handleCreateRoom("", initialAction.maxPlayers).catch(() => {})
    } else {
      handleJoinRoom("", initialAction.roomCode).catch(() => {})
    }
  }, [initialAction, connectionState, handleCreateRoom, handleJoinRoom])

  // Cleanup on unmount
  useEffect(() => {
    return () => { leaveRoom() }
  }, [])

  if (connectionState === "disconnected" || connectionState === "connecting") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          {connectionState === "connecting" ? (
            <>
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                {initialAction?.type === 'create' ? 'Creating room...' : 'Joining room...'}
              </p>
            </>
          ) : error ? (
            <>
              <p className="text-destructive mb-4">{error}</p>
              <button onClick={onBack} className="text-primary underline">Back to menu</button>
            </>
          ) : (
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          )}
        </div>
      </div>
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
        {children({ gameState, localPlayerId, isMultiplayer: true })}
      </>
    )
  }

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
