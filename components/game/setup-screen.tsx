'use client'

import { cn } from '@/lib/utils'
import type { PlayerSetup } from '@/lib/game-types'
import { PALETTES } from '@/lib/game-types'
import { parseDeck } from '@/lib/game-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Swords, Users } from 'lucide-react'

interface SetupScreenProps {
  nPlayers: number
  setNP: (n: number) => void
  setups: PlayerSetup[]
  setSU: (setups: PlayerSetup[]) => void
  onStart: () => void
}

export function SetupScreen({
  nPlayers,
  setNP,
  setups,
  setSU,
  onStart
}: SetupScreenProps) {
  return (
    <div 
      className="min-h-screen bg-background flex flex-col items-center justify-start p-6 md:p-10 overflow-y-auto"
    >
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Swords className="w-10 h-10 text-primary" />
          <h1 className="text-5xl font-black tracking-tight text-primary">
            AstralMagic
          </h1>
        </div>
        <p className="text-sm text-muted-foreground tracking-[0.3em] uppercase">
          MTG Commander Online
        </p>
        <p className="text-xs text-muted-foreground/60 mt-3 max-w-md mx-auto">
          35 demo cards pre-loaded for quick play. Paste Moxfield or MTGO decks for custom play. Supports 2-6 players.
        </p>
      </div>

      {/* Setup panel */}
      <div className="w-full max-w-4xl liquid-glass-strong rounded-2xl p-6 md:p-8">
        {/* Player count selector */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Number of Players
            </span>
          </div>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map((n) => (
              <Button
                key={n}
                variant={nPlayers === n ? "default" : "outline"}
                className={cn(
                  "flex-1 text-xl font-black h-14",
                  nPlayers === n 
                    ? "bg-primary text-primary-foreground" 
                    : "border-border hover:bg-secondary"
                )}
                onClick={() => setNP(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>

        {/* Player setup cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {setups.slice(0, nPlayers).map((p, i) => {
            const pal = PALETTES[i % PALETTES.length]
            const cardCount = parseDeck(p.deck).length

            return (
              <div
                key={i}
                className="liquid-glass-subtle rounded-xl p-4 transition-all hover:bg-white/5"
                style={{ boxShadow: `inset 0 0 20px ${pal.accent}08` }}
              >
                {/* Player name */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: pal.accent }}
                  />
                  <Input
                    value={p.name}
                    onChange={(e) => {
                      const s = setups.slice()
                      s[i] = { ...s[i], name: e.target.value }
                      setSU(s)
                    }}
                    className="bg-transparent border-none p-0 h-auto font-bold focus-visible:ring-0"
                    style={{ color: pal.accent }}
                    placeholder={`Player ${i + 1}`}
                  />
                </div>

                {/* Deck textarea */}
                <textarea
                  value={p.deck}
                  onChange={(e) => {
                    const s = setups.slice()
                    s[i] = { ...s[i], deck: e.target.value }
                    setSU(s)
                  }}
                  placeholder={`Paste deck:\n1 Sol Ring\n1 Command Tower\n...\nCommander\n1 Atraxa, Praetors' Voice`}
                  className={cn(
                    "w-full h-24 bg-background/50 border rounded-lg p-3",
                    "text-xs text-muted-foreground font-mono resize-y",
                    "placeholder:text-muted-foreground/40",
                    "focus:outline-none focus:ring-1 focus:ring-primary/50"
                  )}
                  style={{ borderColor: `${pal.border}40` }}
                />

                {/* Card count indicator */}
                <p 
                  className="text-xs mt-2"
                  style={{ color: cardCount > 0 ? pal.accent : 'var(--muted-foreground)' }}
                >
                  {cardCount > 0 
                    ? `${cardCount} cards detected` 
                    : 'Leave blank for 35 demo cards'
                  }
                </p>

                {/* Playmat URL */}
                <Input
                  value={p.playmat || ''}
                  onChange={(e) => {
                    const s = setups.slice()
                    s[i] = { ...s[i], playmat: e.target.value }
                    setSU(s)
                  }}
                  placeholder="Playmat image URL (optional)"
                  className="mt-3 h-8 text-xs bg-background/30"
                />
              </div>
            )
          })}
        </div>

        {/* Start button */}
        <Button
          onClick={onStart}
          className={cn(
            "w-full h-14 text-lg font-bold tracking-wide",
            "bg-primary hover:bg-primary/90",
            "shadow-lg shadow-primary/20"
          )}
        >
          <Swords className="w-5 h-5 mr-2" />
          BEGIN GAME
        </Button>

        <p className="text-center text-xs text-muted-foreground/50 mt-4">
          Demo cards always available. Custom deck art via Scryfall. Card images &copy; Wizards of the Coast.
        </p>
      </div>
    </div>
  )
}
