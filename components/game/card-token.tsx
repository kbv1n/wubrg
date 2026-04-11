'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { CardInstance } from '@/lib/game-types'
import { CardImage, CardBack } from './card-image'

interface CardTokenProps {
  card: CardInstance
  scale?: number
  onClick?: (e: React.MouseEvent) => void
  onMouseDown?: (e: React.MouseEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function CardToken({
  card,
  scale = 1,
  onClick,
  onMouseDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave
}: CardTokenProps) {
  const hasEntered = useRef(false)
  useEffect(() => { hasEntered.current = true }, [])

  const W = Math.round(126 * scale)
  const H = Math.round(176 * scale)

  const img = (card.showBack && card.imgBack) ? card.imgBack : card.img
  const counters = Object.entries(card.counters || {}).filter(([, v]) => v > 0)

  return (
    // Outer div owns: position + tap rotation + drag events
    // The rotation is an inline style so it always beats any CSS animation
    <div
      onClick={onClick}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute cursor-grab select-none"
      style={{
        left: `${card.x}%`,
        top: `${card.y}%`,
        width: W,
        height: H,
        zIndex: card.z,
        transform: `rotate(${card.tapped ? 90 : 0}deg)`,
        transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
    >
      {/* Inner wrapper: entrance animation only on first mount — never touches the rotate */}
      <div className={cn("w-full h-full relative", !hasEntered.current && "animate-card-enter")}>

        {/* Card frame */}
        <div
          className={cn(
            'w-full h-full rounded-md overflow-hidden',
            'ring-2 transition-all duration-200',
            card.tapped
              ? 'ring-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
              : 'ring-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
          )}
        >
          {card.faceDown ? (
            <CardBack />
          ) : (
            <CardImage
              src={img}
              alt={card.name}
              fallbackText={card.name}
            />
          )}
        </div>

        {/* Counter badges */}
        {counters.length > 0 && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {counters.map(([type, val]) => (
              <span
                key={type}
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  'bg-background/90 border border-border/50 backdrop-blur-sm',
                  type === '+1/+1' && 'text-emerald-400',
                  type === '-1/-1' && 'text-red-400',
                  type !== '+1/+1' && type !== '-1/-1' && 'text-amber-400'
                )}
              >
                {type}: {val}
              </span>
            ))}
          </div>
        )}

        {/* Summoning sickness indicator */}
        {card.summonSick && card.isCreature && !card.tapped && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center z-10">
            <span className="text-[10px]">Z</span>
          </div>
        )}
      </div>
    </div>
  )
}
