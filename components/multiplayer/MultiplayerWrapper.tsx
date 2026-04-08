"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Socket } from "socket.io-client"
import { LobbyScreen } from "./LobbyScreen"
import {
  openSocket,
  createRoom,
  joinRoom,
  closeSocket,
  setActiveSocket,
  convertServerState,
} from "@/lib/socket-client"
import type { MPGameState } from "@/lib/game-types"

interface MultiplayerWrapperProps {
  children: (props: {
    gameState: MPGameState
    localPlayerId: string
    isMultiplayer: true
  }) => React.ReactNode
  onBack: () => void
  initialAction:
    | { type: "create"; maxPlayers: number }
    | { type: "join"; roomCode: string }
    | null
}

type Phase = "connecting" | "lobby" | "playing" | "error"

export function MultiplayerWrapper({ children, onBack, initialAction }: MultiplayerWrapperProps) {
  const [phase, setPhase]               = useState<Phase>("connecting")
  const [gameState, setGameState]       = useState<MPGameState | null>(null)
  const [localPlayerId, setLocalPlayerId] = useState("")
  const [error, setError]               = useState("")

  // Socket owned here — not a global singleton
  const socketRef = useRef<Socket | null>(null)

  // ── Leave helper (used by lobby "Leave" button and back navigation) ────────
  const handleLeave = useCallback(() => {
    if (socketRef.current) {
      closeSocket(socketRef.current)
      socketRef.current = null
    }
    setActiveSocket(null)
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname)
    }
    onBack()
  }, [onBack])

  // ── Main connection effect ─────────────────────────────────────────────────
  // Uses a `cancelled` flag — the correct React pattern for async effects.
  // React StrictMode fires mount→cleanup→mount in development. On cleanup,
  // `cancelled` becomes true and any in-flight socket is discarded. The second
  // mount starts fresh. In production this runs exactly once.
  useEffect(() => {
    if (!initialAction) return

    let cancelled = false
    let socket: Socket | null = null

    async function connect() {
      try {
        // Step 1: open a TCP/WebSocket connection to the server
        socket = await openSocket()
        if (cancelled) { socket.disconnect(); return }

        // Step 2: register ongoing state listener before joining any room
        socket.on("state_sync", (raw: Record<string, unknown>) => {
          if (cancelled) return
          const state = convertServerState(raw)
          setGameState(state)
          setPhase(state.phase === "playing" ? "playing" : "lobby")
        })

        socket.on("disconnect", (reason: string) => {
          if (cancelled) return
          // "io client disconnect" means we called socket.disconnect() ourselves
          if (reason === "io client disconnect") return
          setError("Lost connection to the server")
          setPhase("error")
        })

        // Step 3: create or join a room — server broadcasts state_sync on success
        if (initialAction && initialAction.type === "create") {
          await createRoom(socket, "", initialAction.maxPlayers)
        } else if (initialAction && initialAction.type === "join") {
          await joinRoom(socket, initialAction.roomCode, "")
        }

        if (cancelled) { socket.disconnect(); return }

        // Step 4: store socket and make it available to GameActions
        socketRef.current = socket
        setLocalPlayerId(socket.id!)
        setActiveSocket(socket)
        // Phase transitions to "lobby" when state_sync arrives (see listener above)

      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to connect")
        setPhase("error")
        socket?.disconnect()
      }
    }

    connect()

    // Cleanup: fires on unmount (and on StrictMode simulated unmount in dev)
    return () => {
      cancelled = true
      socket?.disconnect()
      if (socketRef.current === socket) {
        socketRef.current = null
        setActiveSocket(null)
      }
    }
  }, [initialAction]) // Re-runs if the action changes (e.g. user switches from create to join)

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "connecting") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {initialAction?.type === "create" ? "Creating room…" : "Joining room…"}
          </p>
        </div>
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive font-medium">{error || "Something went wrong"}</p>
          <button
            onClick={onBack}
            className="text-primary underline text-sm"
          >
            Back to menu
          </button>
        </div>
      </div>
    )
  }

  if (phase === "lobby" && gameState) {
    return (
      <LobbyScreen
        gameState={gameState}
        localPlayerId={localPlayerId}
        onLeave={handleLeave}
      />
    )
  }

  if (phase === "playing" && gameState) {
    return <>{children({ gameState, localPlayerId, isMultiplayer: true })}</>
  }

  // Shouldn't be reached — guard for unexpected states
  return null
}
