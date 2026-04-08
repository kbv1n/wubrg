'use client'

import { useState, useEffect, useRef, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import type { Player, CardInstance } from '@/lib/game-types'
import { CardToken } from './card-token'
import { CardImage, CardBack } from './card-image'
import { Button } from '@/components/ui/button'
import { 
  Minus, Plus, Skull, BookOpen, Crown, Sparkles, Hand, Eye
} from 'lucide-react'

interface PlayerMatProps {
  player: Player
  isActive: boolean
  isMain: boolean
  isLocal: boolean
  zoom: number
  pan: { x: number; y: number }
  onPan: (pan: { x: number; y: number }) => void
  onResetView: () => void
  cardScale: number
  onLife: (delta: number) => void
  onCardMD: (e: React.MouseEvent, iid: string) => void
  onCardRC: (e: React.MouseEvent, iid: string, zone: string) => void
  onHover: (card: CardInstance) => void
  onHL: () => void
  onZone: (zone: string) => void
  onHandCardMD: (e: React.MouseEvent, iid: string) => void
  isHandDragOver: boolean
  matRef: (el: HTMLDivElement | null) => void
  outerScrollRef: RefObject<HTMLDivElement | null>
  onZoomWithScroll: (zoom: number, mx: number, my: number) => void
}

export function PlayerMat({
  player,
  isActive,
  isMain,
  isLocal,
  zoom,
  pan,
  onPan,
  onResetView,
  cardScale,
  onLife,
  onCardMD,
  onCardRC,
  onHover,
  onHL,
  onZone,
  onHandCardMD,
  isHandDragOver,
  matRef,
  outerScrollRef,
  onZoomWithScroll
}: PlayerMatProps) {
  const { name, pal, life, poison, library, hand, battlefield, graveyard, exile, command } = player
  
  const [hoverIdx, setHoverIdx] = useState(-1)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const [handVisible, setHandVisible] = useState(true) // hand open by default

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target instanceof HTMLElement && 
          !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault()
        setSpaceDown(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Dock-style scaling for hand cards
  const getDockScale = (idx: number): number => {
    if (hoverIdx < 0) return 1
    const distance = Math.abs(idx - hoverIdx)
    if (distance === 0) return 1.4
    if (distance === 1) return 1.2
    if (distance === 2) return 1.08
    return 1
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const el = outerScrollRef?.current
    const rect = el?.getBoundingClientRect() || { left: 0, top: 0 }
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(0.15, Math.min(4.0, zoom + delta))
    onZoomWithScroll(newZoom, mx, my)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      e.preventDefault()
      setIsPanning(true)
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && panStart.current) {
      const dx = e.clientX - panStart.current.mx
      const dy = e.clientY - panStart.current.my
      onPan({ x: panStart.current.px + dx, y: panStart.current.py + dy })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    panStart.current = null
  }

  return (
    <div
      className={cn(
        'flex-1 relative overflow-hidden',
        'flex flex-col transition-all duration-300',
        isMain ? 'min-h-[200px]' : 'min-h-[120px]'
      )}
      style={{
        // Area outside the playmat uses the global background color
        background: 'var(--background)',
      }}
    >
      {/* Active player subtle border highlight */}
      {isActive && (
        <div 
          className="absolute inset-0 pointer-events-none z-0 border-2 rounded"
          style={{
            borderColor: `${pal.accent}40`
          }}
        />
      )}

      {/* Compact Liquid Glass Header - Top Left (hidden for main player, shown in action bar) */}
      {!isMain && (
        <div 
          className={cn(
            "absolute top-3 left-3 z-10",
            "liquid-glass rounded-2xl",
            "flex items-center gap-2 px-3 py-1.5"
          )}
        >
          {/* Player indicator dot */}
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ 
              background: pal.accent, 
              boxShadow: isActive ? `0 0 10px ${pal.accent}` : 'none' 
            }}
          />
          
          {/* Name */}
          <span 
            className="text-sm font-semibold tracking-tight"
            style={{ color: pal.accent }}
          >
            {name}
          </span>

          {/* Life total - only adjustable for local player */}
          <div className="flex items-center gap-0.5 ml-2">
            {isLocal && (
              <Button
                onClick={() => onLife(-1)}
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-full"
              >
                <Minus className="w-3 h-3" />
              </Button>
            )}
            <span 
              className={cn(
                'text-lg font-black tabular-nums min-w-[2rem] text-center',
                life <= 10 && 'text-red-400',
                life > 10 && life <= 20 && 'text-amber-400',
                life > 20 && 'text-foreground'
              )}
            >
              {life}
            </span>
            {isLocal && (
              <Button
                onClick={() => onLife(1)}
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full"
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
          </div>

          {poison > 0 && (
            <span className="text-xs font-bold text-violet-400 flex items-center gap-0.5 ml-1">
              <Skull className="w-3 h-3" />{poison}
            </span>
          )}
        </div>
      )}

      {/* Zone buttons - Top Right (shown for all players) */}
      <div 
        className={cn(
          "absolute top-3 right-3 z-10",
          "liquid-glass-subtle rounded-xl",
          "flex items-center gap-0.5 px-1.5 py-1"
        )}
      >
        <Button
          onClick={() => onZone('library')}
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-2 text-xs font-medium rounded-lg text-blue-400/80 hover:text-blue-400",
            library.length === 0 && "opacity-30"
          )}
        >
          <BookOpen className="w-3 h-3 mr-1" />
          {library.length}
        </Button>
        
        <Button
          onClick={() => onZone('graveyard')}
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-2 text-xs font-medium rounded-lg text-red-400/80 hover:text-red-400",
            graveyard.length === 0 && "opacity-30"
          )}
        >
          <Skull className="w-3 h-3 mr-1" />
          {graveyard.length}
        </Button>

        <Button
          onClick={() => onZone('exile')}
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-2 text-xs font-medium rounded-lg text-violet-400/80 hover:text-violet-400",
            exile.length === 0 && "opacity-30"
          )}
        >
          <Sparkles className="w-3 h-3 mr-1" />
          {exile.length}
        </Button>

        <Button
          onClick={() => onZone('command')}
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-2 text-xs font-medium rounded-lg text-amber-400/80 hover:text-amber-400",
            command.length === 0 && "opacity-30"
          )}
        >
          <Crown className="w-3 h-3 mr-1" />
          {command.length}
        </Button>
      </div>

      {/* Battlefield */}
      <div
        ref={(el) => {
          // Expose the viewport div via both outerScrollRef and matRef.
          // matRef gives the multiplayer board the screen-space origin of this
          // player's playmat area; outerScrollRef is used internally for scroll.
          if (outerScrollRef) (outerScrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el
          matRef(el)
        }}
        className={cn(
          'flex-1 overflow-hidden z-1 relative',
          isPanning ? 'cursor-grabbing' : spaceDown ? 'cursor-grab' : 'cursor-default'
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          data-bfpid={player.pid}
          className={cn(
            'absolute top-0 left-0 transition-colors',
            isHandDragOver && 'ring-2 ring-primary/30',
            player.playmat && 'playmat-texture'
          )}
          style={{
            // Fixed canvas size — the playmat does NOT resize with the browser window.
            // Pan/zoom let players navigate within this fixed space.
            width: 1600,
            height: 900,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            background: player.playmat
              ? undefined
              : pal.bg,
            ...(player.playmat ? {
              backgroundImage: `url(${player.playmat})`,
              backgroundSize: player.playmatFit === 'contain' ? 'contain' : 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            } : {}),
          }}
        >
          {battlefield.map((card) => (
            <CardToken
              key={card.iid}
              card={card}
              scale={cardScale}
              onMouseDown={(e) => onCardMD(e, card.iid)}
              onContextMenu={(e) => onCardRC(e, card.iid, 'battlefield')}
              onMouseEnter={() => onHover(card)}
              onMouseLeave={onHL}
            />
          ))}
          
          {/* Empty battlefield hint */}
          {battlefield.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-1 pointer-events-none">
              <span className={cn(
                "text-xs transition-colors",
                isHandDragOver ? "text-primary/80 font-medium" : "text-white/10"
              )}>
                {isHandDragOver ? 'Drop to play' : ''}
              </span>
            </div>
          )}

          {/* Drop overlay */}
          {isHandDragOver && battlefield.length > 0 && (
            <div 
              className="absolute inset-0 border border-dashed rounded-lg pointer-events-none flex items-end justify-center pb-3"
              style={{ borderColor: `${pal.accent}40`, background: `${pal.glow}10` }}
            >
              <span 
                className="text-xs font-medium px-3 py-1 rounded-full liquid-glass-subtle"
                style={{ color: pal.accent }}
              >
                Release to play
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Command zone - Floating pill */}
      {command.length > 0 && (
        <div 
          className="absolute right-3 bottom-20 z-10 flex gap-1.5"
        >
          {command.map((c) => (
            <div
              key={c.iid}
              className="w-10 h-14 rounded-lg overflow-hidden cursor-pointer ring-1 transition-all hover:scale-110"
              style={{
                outline: `1px solid ${pal.accent}60`,
                boxShadow: `0 4px 20px ${pal.glow}`
              }}
              onContextMenu={(e) => onCardRC(e, c.iid, 'command')}
              onMouseEnter={() => onHover(c)}
              onMouseLeave={onHL}
            >
              <CardImage src={c.img} alt={c.name} />
            </div>
          ))}
        </div>
      )}

      {/* Hand toggle button - Always visible when hand has cards */}
      {isMain && hand.length > 0 && (
        <button
          onClick={() => setHandVisible(!handVisible)}
          className={cn(
            "absolute bottom-4 left-1/2 -translate-x-1/2 z-30",
            "liquid-glass-readable rounded-full px-4 py-2",
            "flex items-center gap-2 cursor-pointer",
            "transition-all duration-200 hover:scale-105",
            handVisible && "opacity-70"
          )}
          style={{ 
            borderColor: `${pal.accent}40`,
            boxShadow: handVisible ? 'none' : `0 0 20px ${pal.glow}40`
          }}
        >
          <Hand className="w-4 h-4" style={{ color: pal.accent }} />
          <span className="text-sm font-bold" style={{ color: pal.accent }}>
            {hand.length}
          </span>
          <Eye 
            className={cn(
              "w-4 h-4 transition-transform",
              handVisible && "rotate-180"
            )} 
            style={{ color: pal.accent }} 
          />
        </button>
      )}

      {/* Dock-style Hand - 3x larger, toggleable */}
      {isMain && hand.length > 0 && handVisible && (
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 z-20",
            "flex justify-center items-end",
            "pb-4 pt-12",
            "animate-slide-up"
          )}
        >
          <div className="dock-hand">
            {!isLocal ? (
              hand.map((_, i) => (
                <div 
                  key={i} 
                  className="dock-card w-[126px] h-[176px] rounded-xl overflow-hidden opacity-60"
                  style={{ '--dock-scale': 1 } as React.CSSProperties}
                >
                  <CardBack />
                </div>
              ))
            ) : (
              hand.map((c, idx) => {
                const scale = getDockScale(idx)
                const isHovered = hoverIdx === idx
                return (
                  <div
                    key={c.iid}
                    className="dock-card cursor-grab select-none"
                    style={{ 
                      '--dock-scale': scale,
                      zIndex: isHovered ? 100 : 50 - Math.abs(idx - (hand.length / 2))
                    } as React.CSSProperties}
                    onMouseEnter={() => { setHoverIdx(idx); onHover(c) }}
                    onMouseLeave={() => { setHoverIdx(-1); onHL() }}
                  >
                    <div
                      className={cn(
                        "w-[126px] h-[176px] rounded-xl overflow-hidden",
                        "ring-2 transition-all duration-200"
                      )}
                      style={{
                        outline: `2px solid ${isHovered ? pal.accent : 'rgba(255,255,255,0.15)'}`,
                        boxShadow: isHovered
                          ? `0 0 40px ${pal.glow}, 0 20px 50px rgba(0,0,0,0.7)`
                          : '0 8px 24px rgba(0,0,0,0.5)'
                      }}
                      onMouseDown={(e) => onHandCardMD(e, c.iid)}
                      onContextMenu={(e) => onCardRC(e, c.iid, 'hand')}
                    >
                      <CardImage src={c.img} alt={c.name} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Non-main player hand indicator */}
      {!isMain && hand.length > 0 && (
        <div 
          className="absolute bottom-3 left-3 z-10 liquid-glass-subtle rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1.5"
          style={{ color: pal.accent }}
        >
          <Hand className="w-3.5 h-3.5" />
          {hand.length}
        </div>
      )}
    </div>
  )
}
