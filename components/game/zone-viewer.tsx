'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { Player, CardInstance, ZoneType } from '@/lib/game-types'
import { CardImage, CardBack } from './card-image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Eye, Swords, Hand, Skull, Sparkles, Search, Plus } from 'lucide-react'

interface ScryfallCard {
  name: string
  image_uris?: { small: string; normal: string; png: string }
  card_faces?: { image_uris?: { small: string; normal: string; png: string } }[]
}

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
  onReveal?: (card: CardInstance) => void
  onCreateToken?: (name: string, imageUrl: string) => void
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
  onMill,
  onReveal,
  onCreateToken
}: ZoneViewerProps) {
  const [query, setQuery] = useState('')
  const [millN, setMillN] = useState('')
  const [scryN, setScryN] = useState('')
  const [showScryInput, setShowScryInput] = useState(false)
  const [showMillInput, setShowMillInput] = useState(false)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [bannerVisible, setBannerVisible] = useState(true)
  const [showTokenSearch, setShowTokenSearch] = useState(false)
  const [tokenQuery, setTokenQuery] = useState('')
  const [tokenResults, setTokenResults] = useState<ScryfallCard[]>([])
  const [tokenLoading, setTokenLoading] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const tokenSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (onReveal) {
      const card = cards.find(c => c.iid === iid)
      if (card) onReveal(card)
    }
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

  const searchTokens = useCallback((q: string) => {
    if (tokenSearchTimer.current) clearTimeout(tokenSearchTimer.current)
    if (!q.trim()) {
      setTokenResults([])
      return
    }
    tokenSearchTimer.current = setTimeout(async () => {
      setTokenLoading(true)
      try {
        const res = await fetch(
          `https://api.scryfall.com/cards/search?q=type:token+${encodeURIComponent(q)}&unique=prints&order=name`
        )
        if (res.ok) {
          const data = await res.json()
          setTokenResults(data.data?.slice(0, 20) ?? [])
        } else {
          setTokenResults([])
        }
      } catch {
        setTokenResults([])
      } finally {
        setTokenLoading(false)
      }
    }, 350)
  }, [])

  const getCardImage = (card: ScryfallCard): string | null => {
    if (card.image_uris?.normal) return card.image_uris.normal
    if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal
    return null
  }

  const getCardThumb = (card: ScryfallCard): string | null => {
    if (card.image_uris?.small) return card.image_uris.small
    if (card.card_faces?.[0]?.image_uris?.small) return card.card_faces[0].image_uris.small
    return null
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

          {/* Create Token */}
          {onCreateToken && (
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "h-7 text-xs text-cyan-400 border-cyan-400/40",
                showTokenSearch && "bg-cyan-400/10"
              )}
              onClick={() => {
                setShowTokenSearch(!showTokenSearch)
                if (showTokenSearch) {
                  setTokenQuery('')
                  setTokenResults([])
                }
              }}
            >
              <Plus className="w-3 h-3 mr-1" /> Token
            </Button>
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

        {/* Token search panel */}
        {showTokenSearch && onCreateToken && (
          <div className="px-4 py-3 border-b border-white/10 bg-cyan-900/10">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-3 h-3 text-cyan-400" />
              <Input
                autoFocus
                value={tokenQuery}
                onChange={(e) => {
                  setTokenQuery(e.target.value)
                  searchTokens(e.target.value)
                }}
                placeholder="Search for tokens (e.g. Soldier, Treasure, Angel)..."
                className="h-7 text-xs flex-1"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setShowTokenSearch(false)
                  setTokenQuery('')
                  setTokenResults([])
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            {tokenLoading && (
              <div className="text-xs text-muted-foreground py-2">Searching...</div>
            )}
            {tokenResults.length > 0 && (
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                {tokenResults.map((tc, i) => {
                  const thumb = getCardThumb(tc)
                  const img = getCardImage(tc)
                  if (!thumb || !img) return null
                  return (
                    <div key={`${tc.name}-${i}`} className="flex flex-col items-center gap-1">
                      <div className="w-16 h-22 rounded overflow-hidden border border-cyan-400/30">
                        <img src={thumb} alt={tc.name} className="w-full h-full object-cover" />
                      </div>
                      <Button
                        size="sm"
                        className="h-5 px-2 text-[10px] bg-cyan-600 hover:bg-cyan-500"
                        onClick={() => onCreateToken(tc.name, img)}
                      >
                        Create
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
            {!tokenLoading && tokenQuery && tokenResults.length === 0 && (
              <div className="text-xs text-muted-foreground py-2">No tokens found</div>
            )}
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
