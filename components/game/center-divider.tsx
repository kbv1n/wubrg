'use client'

import { cn } from '@/lib/utils'
import type { Player } from '@/lib/game-types'
import { Backlight } from '@/components/ui/backlight'
import { Settings, Dice6, Coins, ChevronDown, Minus, Plus, ArrowRight, RotateCcw, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GiGluttonousSmile } from "react-icons/gi";
interface ActionBarProps {
  players: Player[]
  turn: number
  round: number
  localPid: number
  hasDrawnInitial: boolean
  zoom: number
  onPassTurn: () => void
  onSettings: () => void
  onLog: () => void
  onDice: () => void
  onCoin: () => void
  logOpen: boolean
  onCmdDmg: (pid: number) => void
  onLife: (pid: number, delta: number) => void
  onDraw: (pid: number) => void
  onDraw7: (pid: number) => void
  onUntapAll: (pid: number) => void
}

export function CenterDivider({
  players,
  turn,
  round,
  localPid,
  hasDrawnInitial,
  zoom,
  onPassTurn,
  onSettings,
  onLog,
  onDice,
  onCoin,
  onCmdDmg,
  onLife,
  onDraw,
  onDraw7,
  onUntapAll,
}: ActionBarProps) {
  if (!players.length || !players[0]) return null
  const currentPlayer = players[turn] || players[0]
  const pal = currentPlayer.pal
  const mainPlayer = players[localPid] || players[0]
  const mainPal = mainPlayer.pal

  return (
    <div className="absolute left-0 right-0 top-[calc(50%-20px)] -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-2 px-4">
      {/* Main Action Bar */}
      <div 
        className="pointer-events-auto liquid-glass-readable rounded-4xl px-5 py-3 flex items-center gap-4"
        style={{
          boxShadow: `0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)`,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 pr-4 border-r border-white/10">
          <GiGluttonousSmile className='w-12 h-12 fill-primary-foreground rounded-full p-1 '/>
        </div>

        {/* Active player indicator with backlight effect */}
        <Backlight blur={12} className="flex items-center">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300"
            style={{
              background: `${pal.accent}20`,
              border: `1px solid ${pal.accent}40`,
            }}
          >
            <div
              className="w-3 h-3 rounded-full animate-pulse-glow"
              style={{ background: pal.accent, boxShadow: `0 0 12px ${pal.accent}` }}
            />
            <span className="font-bold text-sm" style={{ color: pal.accent }}>
              {currentPlayer.name}&apos;s Turn
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10" style={{ color: pal.accent }}>
              Round {round}
            </span>
          </div>
        </Backlight>

        <div className="w-px h-8 bg-white/10" />

        {/* All player life totals - clickable for cmd damage */}
        <div className="flex items-center gap-2">
          {players.map((p) => {
            const isActive = p.pid === turn
            const isLocal = p.pid === localPid
            return (
              <button
                key={p.pid}
                onClick={() => onCmdDmg(p.pid)}
                className={cn(
                  'flex flex-col items-center px-3 py-1.5 rounded-xl transition-all duration-200',
                  'hover:bg-white/10 cursor-pointer',
                  isActive && 'ring-2'
                )}
                style={{
                  background: isActive ? `${p.pal.accent}15` : 'transparent',
                  ringColor: isActive ? p.pal.accent : 'transparent',
                }}
                title={`${p.name} - Click for Commander Damage`}
              >
                <span 
                  className="text-[10px] font-semibold truncate max-w-[60px]"
                  style={{ color: p.pal.accent }}
                >
                  {isLocal ? 'You' : p.name.slice(0, 8)}
                </span>
                <span
                  className={cn(
                    'text-xl font-black tabular-nums leading-none',
                    p.life <= 10 && 'text-red-500',
                    p.life > 10 && p.life <= 20 && 'text-amber-500',
                    p.life > 20 && 'text-foreground'
                  )}
                >
                  {p.life}
                </span>
              </button>
            )
          })}
        </div>

        <div className="w-px h-8 bg-white/10" />

        {/* Main player (Player 1) life controls */}
        <div className="flex items-center gap-1">
          <Button
            onClick={() => onLife(localPid, -1)}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
            title="Lose 1 Life"
          >
            <Minus className="w-5 h-5" />
          </Button>
          <span 
            className="text-2xl font-black tabular-nums min-w-[3rem] text-center"
            style={{ color: mainPal.accent }}
          >
            {mainPlayer.life}
          </span>
          <Button
            onClick={() => onLife(localPid, 1)}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl"
            title="Gain 1 Life"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="w-px h-8 bg-white/10" />

        {/* Utility buttons */}
        <div className="flex items-center gap-1">
          <Button
            onClick={onDice}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-violet-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-xl"
            title="Roll Dice"
          >
            <Dice6 className="w-5 h-5" />
          </Button>
          <Button
            onClick={onCoin}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl"
            title="Flip Coin"
          >
            <Coins className="w-5 h-5" />
          </Button>
          <Button
            onClick={onLog}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-sky-500 hover:text-sky-400 hover:bg-sky-500/10 rounded-xl"
            title="Action Log"
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
          <Button
            onClick={onSettings}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-white/10 rounded-xl"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        <div className="w-px h-8 bg-white/10" />

        {/* Zoom indicator */}
        <span className="text-xs font-mono text-muted-foreground tabular-nums min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Sub-bar: Draw, Untap, Pass Turn */}
      <div 
        className="pointer-events-auto liquid-glass-subtle rounded-xl px-3 py-2 flex items-center gap-2"
        style={{
          boxShadow: `0 4px 16px rgba(0,0,0,0.1)`,
        }}
      >
        {/* Draw 7 or Draw 1 */}
        {!hasDrawnInitial ? (
          <Button
            onClick={() => onDraw7(localPid)}
            className="h-8 text-sm px-4 rounded-lg font-bold bg-[#fb8f23] hover:bg-[#fb8f23]/90 text-white border-0"
          >
            <Layers className="w-4 h-4 mr-1.5" />
            Draw 7
          </Button>
        ) : (
          <Button
            onClick={() => onDraw(localPid)}
            variant="outline"
            className="h-8 text-sm px-4 rounded-lg font-semibold"
            style={{ borderColor: `${mainPal.accent}40`, color: mainPal.accent }}
          >
            Draw
          </Button>
        )}

        <div className="w-px h-5 bg-white/10" />

        <Button
          onClick={() => onUntapAll(localPid)}
          variant="ghost"
          className="h-8 text-sm px-3 rounded-lg font-semibold text-[#00f5d4] hover:text-[#00f5d4]/80 hover:bg-[#00f5d4]/10"
          title="Untap all permanents"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Untap
        </Button>

        <div className="w-px h-5 bg-white/10" />

        <Button
          onClick={onPassTurn}
          className="h-8 text-sm px-4 rounded-lg font-bold bg-[#1fa2ff] hover:bg-[#1fa2ff]/90 text-white border-0"
        >
          Pass Turn
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )
}
