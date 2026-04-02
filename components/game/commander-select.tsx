'use client'

import { cn } from '@/lib/utils'
import type { GameState } from '@/lib/game-types'
import { CardImage } from './card-image'
import { Button } from '@/components/ui/button'
import { Swords, Check, Crown } from 'lucide-react'

interface CommanderSelectScreenProps {
  game: GameState
  cmdSelections: Record<number, string[]>
  setCmdSelections: (fn: (prev: Record<number, string[]>) => Record<number, string[]>) => void
  cmdReady: Record<number, boolean>
  setCmdReady: (fn: (prev: Record<number, boolean>) => Record<number, boolean>) => void
  onBegin: () => void
}

export function CommanderSelectScreen({
  game,
  cmdSelections,
  setCmdSelections,
  cmdReady,
  setCmdReady,
  onBegin
}: CommanderSelectScreenProps) {
  const allReady = game.players.every((p) => cmdReady[p.pid])

  const toggleCard = (pid: number, iid: string) => {
    setCmdSelections((prev) => {
      const cur = (prev[pid] || []).slice()
      const idx = cur.indexOf(iid)
      if (idx !== -1) {
        cur.splice(idx, 1)
      } else if (cur.length < 2) {
        cur.push(iid)
      }
      return { ...prev, [pid]: cur }
    })
    setCmdReady((prev) => ({ ...prev, [pid]: false }))
  }

  const setReady = (pid: number) => {
    setCmdReady((prev) => ({ ...prev, [pid]: true }))
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Crown className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-black tracking-tight text-primary">
            COMMANDER SELECTION
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Each player selects up to 2 legendary commanders. Click &quot;Ready&quot; when done.
        </p>
      </div>

      {/* Player selection cards */}
      <div className="flex gap-4 flex-wrap justify-center w-full max-w-6xl">
        {game.players.map((p) => {
          const pal = p.pal
          const eligible = [...p.library, ...p.command].filter(
            (c) => c.isLegendary && (c.isCreature || c.isPlaneswalker)
          )
          const sel = cmdSelections[p.pid] || []
          const ready = cmdReady[p.pid]

          return (
            <div
              key={p.pid}
              className={cn(
                "flex-1 min-w-[260px] max-w-[320px]",
                "bg-card/80 backdrop-blur-sm border-2 rounded-xl overflow-hidden",
                "flex flex-col transition-all duration-200"
              )}
              style={{
                borderColor: ready ? pal.accent : pal.border,
                boxShadow: ready ? `0 0 20px ${pal.glow}` : 'none'
              }}
            >
              {/* Player header */}
              <div 
                className="p-4 border-b"
                style={{ 
                  borderColor: pal.border,
                  background: `${pal.accent}15`
                }}
              >
                <h2 className="font-bold text-lg" style={{ color: pal.accent }}>
                  {p.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {eligible.length} eligible commander{eligible.length !== 1 ? 's' : ''} &middot; {sel.length}/2 selected
                </p>
              </div>

              {/* Cards grid */}
              <div className="flex-1 overflow-y-auto p-3 max-h-[320px] custom-scrollbar">
                {eligible.length === 0 ? (
                  <p className="text-muted-foreground/50 text-xs text-center py-8">
                    No legendary creatures or planeswalkers found.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {eligible.map((c) => {
                      const isSelected = sel.includes(c.iid)
                      return (
                        <div
                          key={c.iid}
                          className={cn(
                            "cursor-pointer transition-all duration-150",
                            ready && !isSelected && "opacity-40",
                            isSelected && "scale-105"
                          )}
                          onClick={() => !ready && toggleCard(p.pid, c.iid)}
                        >
                          <div
                            className={cn(
                              "w-16 h-[88px] rounded overflow-hidden ring-2 transition-all"
                            )}
                            style={{
                              ringColor: isSelected ? pal.accent : pal.border,
                              boxShadow: isSelected ? `0 0 12px ${pal.glow}` : 'none'
                            }}
                          >
                            <CardImage src={c.img} alt={c.name} />
                          </div>
                          <p 
                            className={cn(
                              "text-[10px] text-center mt-1 max-w-16 truncate",
                              isSelected ? "font-medium" : ""
                            )}
                            style={{ color: isSelected ? pal.accent : '#8a90a0' }}
                          >
                            {c.name}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Ready button */}
              <div className="p-3 border-t" style={{ borderColor: pal.border }}>
                {ready ? (
                  <div 
                    className="text-center py-2 font-bold flex items-center justify-center gap-2"
                    style={{ color: pal.accent }}
                  >
                    <Check className="w-4 h-4" />
                    Ready!
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    style={{ 
                      background: `${pal.accent}20`,
                      borderColor: pal.accent,
                      color: pal.accent
                    }}
                    variant="outline"
                    onClick={() => setReady(p.pid)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Ready
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Begin button */}
      <div className="mt-10 flex items-center gap-6">
        <span className="text-sm text-muted-foreground">
          {game.players.filter((p) => cmdReady[p.pid]).length} / {game.players.length} ready
        </span>
        <Button
          onClick={onBegin}
          disabled={!allReady}
          className={cn(
            "px-10 py-6 text-lg font-bold",
            allReady 
              ? "bg-primary shadow-lg shadow-primary/30" 
              : "bg-secondary text-muted-foreground"
          )}
        >
          <Swords className="w-5 h-5 mr-2" />
          BEGIN!
        </Button>
      </div>
    </div>
  )
}
