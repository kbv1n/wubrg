'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { Player, CardInstance, ZoneType } from '@/lib/game-types'
import { CardImage, CardBack } from './card-image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Eye, Swords, Hand, Skull, Sparkles, Search } from 'lucide-react'

interface ZoneViewerProps {
  player: Player
  zone: ZoneType
  onClose: () => void
  onMove: (iid: string, zone: ZoneType) => void
  onHover: (card: CardInstance) => void
  onHL: () => void
  onRC: (e: React.MouseEvent, card: CardInstance) => void
  onScry: (n: number) => void
  onMill: (n: number) => void
}

const ZONE_LABELS: Record<string, string> = {
  graveyard: 'Graveyard',
  exile: 'Exile',
  library: 'Library',
  hand: 'Hand',
  command: 'Command Zone'
}

export function ZoneViewer({
  player,
  zone,
  onClose,
  onMove,
  onHover,
  onHL,
  onRC,
  onScry,
  onMill
}: ZoneViewerProps) {
  const [query, setQuery] = useState('')
  const [millN, setMillN] = useState('')
  const [scryN, setScryN] = useState('')
  const [showScryInput, setShowScryInput] = useState(false)
  const [showMillInput, setShowMillInput] = useState(false)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [bannerVisible, setBannerVisible] = useState(true)
  const logRef = useRef<HTMLDivElement>(null)

  const cards = player[zone] || []
  const filtered = query 
    ? cards.filter((c) => c.name?.toLowerCase().includes(query.toLowerCase()))
    : cards
  const pal = player.pal
  const isLib = zone === 'library'

  useEffect(() => {
    if (isLib) {
      setBannerVisible(true)
      const t = setTimeout(() => setBannerVisible(false), 3000)
      return () => clearTimeout(t)
    }
  }, [zone, isLib])

  const revealCard = (iid: string) => {
    setRevealed(prev => new Set(prev).add(iid))
  }

  const doScry = () => {
    const n = Math.max(1, Math.min(20, parseInt(scryN) || 1))
    onScry(n)
    setShowScryInput(false)
    setScryN('')
  }

  const doMill = () => {
    const n = Math.max(1, Math.min(cards.length || 1, parseInt(millN) || 1))
    onMill(n)
    setShowMillInput(false)
    setMillN('')
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9000] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="liquid-glass-strong rounded-2xl w-[min(800px,95vw)] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="px-4 py-3 border-b border-white/10 flex items-center gap-3 flex-wrap"
          style={{ 
            background: `${pal.accent}15`
          }}
        >
          <span className="font-bold text-sm" style={{ color: pal.accent }}>
            {player.name} — {ZONE_LABELS[zone] || zone}
          </span>
          <span className="text-xs text-muted-foreground">
            ({cards.length})
          </span>

          {/* Library actions */}
          {isLib && (
            <div className="flex gap-2 items-center">
              {showScryInput ? (
                <div className="flex items-center gap-1">
                  <Input
                    autoFocus
                    value={scryN}
                    onChange={(e) => setScryN(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') doScry()
                      if (e.key === 'Escape') setShowScryInput(false)
                    }}
                    placeholder="1-20"
                    className="w-12 h-7 text-xs"
                  />
                  <Button size="sm" className="h-7" onClick={doScry}>Go</Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0"
                    onClick={() => setShowScryInput(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-violet-400 border-violet-400/40"
                  onClick={() => { setShowScryInput(true); setShowMillInput(false) }}
                >
                  <Eye className="w-3 h-3 mr-1" /> Scry N
                </Button>
              )}

              {showMillInput ? (
                <div className="flex items-center gap-1">
                  <Input
                    autoFocus
                    value={millN}
                    onChange={(e) => setMillN(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') doMill()
                      if (e.key === 'Escape') setShowMillInput(false)
                    }}
                    placeholder={`1-${cards.length}`}
                    className="w-12 h-7 text-xs"
                  />
                  <Button size="sm" className="h-7 bg-red-500 hover:bg-red-600" onClick={doMill}>
                    Go
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0"
                    onClick={() => setShowMillInput(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-red-400 border-red-400/40"
                  onClick={() => { setShowMillInput(true); setShowScryInput(false) }}
                >
                  <Skull className="w-3 h-3 mr-1" /> Mill N
                </Button>
              )}
            </div>
          )}

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="h-7 w-36 text-xs pl-7"
            />
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Library warning */}
        {isLib && (
          <div
            className={cn(
              "text-center text-xs font-medium px-4 py-2 border-b transition-opacity duration-700",
              bannerVisible ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: 'rgba(113,63,18,0.2)',
              borderColor: 'rgba(200,150,10,0.3)',
              color: '#c8960a'
            }}
          >
            Library contents are visible to all players at this table
          </div>
        )}

        {/* Cards grid */}
        <div 
          ref={logRef}
          className="flex-1 overflow-y-auto p-4 custom-scrollbar"
        >
          {filtered.length === 0 ? (
            <div className="text-muted-foreground/50 text-sm text-center py-12">
              {cards.length === 0 ? `${ZONE_LABELS[zone] || zone} is empty` : 'No matches'}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {filtered.map((c) => {
                const faceDown = isLib && !revealed.has(c.iid)
                return (
                  <div key={c.iid} className="flex flex-col items-center gap-2">
                    <div
                      className="w-20 h-28 rounded overflow-hidden cursor-pointer border transition-all hover:ring-2"
                      style={{ borderColor: pal.border, ['--tw-ring-color' as string]: pal.accent }}
                      onContextMenu={(e) => { 
                        e.preventDefault()
                        if (!faceDown) onRC(e, c)
                      }}
                      onMouseEnter={() => { if (!faceDown) onHover(c) }}
                      onMouseLeave={onHL}
                    >
                      {faceDown ? (
                        <CardBack />
                      ) : (
                        <CardImage src={c.img} alt={c.name} />
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap justify-center">
                      {faceDown && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 px-2 text-[10px] text-amber-400 border-amber-400/40"
                          onClick={() => revealCard(c.iid)}
                        >
                          <Eye className="w-2 h-2 mr-0.5" /> Reveal
                        </Button>
                      )}
                      {!faceDown && zone !== 'battlefield' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 px-2 text-[10px] text-emerald-400 border-emerald-400/40"
                          onClick={() => onMove(c.iid, 'battlefield')}
                        >
                          <Swords className="w-2 h-2" />
                        </Button>
                      )}
                      {!faceDown && zone !== 'hand' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 px-2 text-[10px] border-border/40"
                          onClick={() => onMove(c.iid, 'hand')}
                        >
                          <Hand className="w-2 h-2" />
                        </Button>
                      )}
                      {!faceDown && zone !== 'graveyard' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 px-2 text-[10px] text-red-400 border-red-400/40"
                          onClick={() => onMove(c.iid, 'graveyard')}
                        >
                          <Skull className="w-2 h-2" />
                        </Button>
                      )}
                      {!faceDown && zone !== 'exile' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 px-2 text-[10px] text-violet-400 border-violet-400/40"
                          onClick={() => onMove(c.iid, 'exile')}
                        >
                          <Sparkles className="w-2 h-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
