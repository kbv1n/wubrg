"use client"

import { useState } from "react"
import { Check, Crown, Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { PALETTES } from "@/lib/game-types"
import type { PlayerState } from "@/lib/game-types"
import { GiCrownOfThorns, GiDodging  } from "react-icons/gi"

interface PlayerSlotProps {
  player: PlayerState
  isHost: boolean
  isLocal: boolean
  takenColors: number[]
  onColorChange?: (colorIndex: number) => void
  onNameChange?: (name: string) => void
}

export function PlayerSlot({
  player,
  isHost,
  isLocal,
  takenColors,
  onColorChange,
  onNameChange,
}: PlayerSlotProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(player.name)

  const submitName = () => {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== player.name) {
      onNameChange?.(trimmed)
    }
    setEditingName(false)
  }
  const pal = player.colorIndex >= 0 ? PALETTES[player.colorIndex] : null
  
  return (
    <div 
      className={cn(
        "p-4 rounded-xl border transition-all",
        player.ready 
          ? "bg-primary/10 border-primary/40" 
          : "bg-background border-border/50"
      )}
      style={pal ? { 
        borderColor: `${pal.accent}60`,
        background: `${pal.accent}10`
      } : undefined}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Connection indicator */}
          {player.connected && !isHost ? (
            <GiDodging className="w-5 h-5 text-primary" />
          ) : isHost ? (
           <GiCrownOfThorns  className="w-6 h-6" />

           ) : null}
          
          {/* Player name — editable for local player */}
          {isLocal && onNameChange ? (
            editingName ? (
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onBlur={submitName}
                onKeyDown={e => { if (e.key === 'Enter') submitName(); if (e.key === 'Escape') setEditingName(false) }}
                maxLength={20}
                className="font-bold text-lg bg-transparent border-b border-current outline-none w-32"
                style={pal ? { color: pal.accent } : undefined}
              />
            ) : (
              <button
                onClick={() => { setNameInput(player.name); setEditingName(true) }}
                className="font-bold stroke-black stroke-5 text-lg underline-offset-2 hover:underline cursor-text [-webkit-text-stroke-width:1px] [-webkit-text-stroke-color:rgba(0,0,0,0.1)]"
                style={pal ? { color: pal.accent } : undefined}
                title="Click to edit your name"
              >
                {player.name}
              </button>
            )
          ) : (
            <span className="font-bold text-lg" style={pal ? { color: pal.accent } : undefined}>
              {player.name}
            </span>
          )}
          
          {/* Host badge */}
        </div>

        {/* Ready indicator */}
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
          player.ready
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
        )}>
          {player.ready ? <Check className="w-4 h-4" /> : null}
          {player.ready ? "Ready" : "Not Ready"}
        </div>
      </div>

      {/* Color Selection (only for local player) */}
      {isLocal && onColorChange ? (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-2">Select Color</p>
          <div className="flex gap-1.5 flex-wrap">
            {PALETTES.map((p, idx) => {
              const isTaken = takenColors.includes(idx) && player.colorIndex !== idx
              return (
                <button
                  key={idx}
                  onClick={() => !isTaken && onColorChange(idx)}
                  disabled={isTaken}
                  className={cn(
                    "w-8 h-8 rounded-lg transition-all border-2",
                    player.colorIndex === idx && "ring-2 ring-white ring-offset-2 ring-offset-card",
                    isTaken && "opacity-30 cursor-not-allowed"
                  )}
                  style={{
                    backgroundColor: p.accent,
                    borderColor: player.colorIndex === idx ? "white" : "transparent"
                  }}
                  title={isTaken ? "Color taken" : `Select color ${idx + 1}`}
                />
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Deck Status */}
      <div className="flex items-center gap-2 text-sm">
        <div className={cn(
          "w-2 h-2 rounded-full",
          player.deckText ? "bg-primary" : "bg-muted-foreground/30"
        )} />
        <span className="text-muted-foreground">
          {player.deckText 
            ? `Deck loaded (${player.library?.length || 0} cards)`
            : "No deck loaded"
          }
        </span>
      </div>

      {/* Playmat Status */}
      {player.playmatUrl ? (
        <div className="flex items-center gap-2 text-sm mt-1">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-muted-foreground">Custom playmat set</span>
        </div>
      ) : null}
    </div>
  )
}
