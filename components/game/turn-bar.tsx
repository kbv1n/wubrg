'use client'

import { cn } from '@/lib/utils'
import type { Player } from '@/lib/game-types'
import { Settings, Scroll, Dice6, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TurnBarProps {
  players: Player[]
  turn: number
  round: number
  onPassTurn: () => void
  onSettings: () => void
  onLog: () => void
  onDice: () => void
  onCoin: () => void
  logOpen: boolean
}

export function TurnBar({
  players,
  turn,
  round,
  onPassTurn,
  onSettings,
  onLog,
  onDice,
  onCoin,
  logOpen
}: TurnBarProps) {
  const currentPlayer = players[turn] || players[0]
  const pal = currentPlayer.pal

  return (
    <div className="flex items-center gap-3 px-4 py-2 liquid-glass border-b border-white/5 z-10 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-black tracking-tight text-primary">AstralMagic</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">MTG Commander</span>
      </div>

      <div className="w-px h-6 bg-white/10" />

      {/* Active player indicator */}
      <div
        className="flex items-center gap-2 px-4 py-1.5 rounded-full liquid-glass-subtle transition-all duration-300"
        style={{
          boxShadow: `0 0 20px ${pal.accent}20, inset 0 0 20px ${pal.accent}10`,
          borderColor: `${pal.accent}30`,
        }}
      >
        <div
          className="w-2 h-2 rounded-full animate-pulse-glow"
          style={{ background: pal.accent, boxShadow: `0 0 8px ${pal.accent}` }}
        />
        <span className="font-bold text-sm" style={{ color: pal.accent }}>
          {currentPlayer.name}
        </span>
        <span className="text-xs opacity-70" style={{ color: pal.accent }}>
          Round {round}
        </span>
      </div>

      {/* Pass turn button */}
      <Button
        onClick={onPassTurn}
        className="rounded-full font-bold text-xs px-4 liquid-glass-subtle hover:bg-white/10"
        style={{
          boxShadow: `0 0 15px ${pal.accent}15`,
          borderColor: `${pal.accent}40`,
          color: pal.accent,
        }}
        variant="outline"
        size="sm"
      >
        Pass Turn
      </Button>

      <div className="flex-1" />

      {/* Life totals mini display */}
      <div className="hidden md:flex items-center gap-1.5 liquid-glass-subtle rounded-full px-2 py-1">
        {players.map((p) => {
          const isActive = p.pid === turn
          return (
            <div
              key={p.pid}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full transition-all duration-200',
                isActive && 'ring-1 ring-white/20'
              )}
              style={{
                background: isActive ? `${p.pal.accent}20` : 'transparent',
              }}
              title={p.name}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: p.pal.accent }}
              />
              <span
                className={cn(
                  'text-xs font-bold tabular-nums',
                  p.life <= 10 && 'text-red-400',
                  p.life > 10 && p.life <= 20 && 'text-amber-400',
                  p.life > 20 && 'text-foreground/80'
                )}
              >
                {p.life}
              </span>
            </div>
          )
        })}
      </div>

      <div className="w-px h-6 bg-white/10" />

      {/* Utility buttons */}
      <div className="flex items-center gap-1">
        <Button
          onClick={onDice}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          title="Roll Dice"
        >
          <Dice6 className="w-4 h-4" />
        </Button>
        <Button
          onClick={onCoin}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          title="Flip Coin"
        >
          <Coins className="w-4 h-4" />
        </Button>
        <Button
          onClick={onLog}
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            logOpen ? "text-primary" : "text-muted-foreground hover:text-primary"
          )}
          title="Game Log"
        >
          <Scroll className="w-4 h-4" />
        </Button>
        <Button
          onClick={onSettings}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
