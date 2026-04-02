'use client'

import { cn } from '@/lib/utils'
import type { CardInstance } from '@/lib/game-types'
import { getRarityColor } from '@/lib/game-data'
import { CardImage } from './card-image'
import { ManaSymbols } from './mana-symbols'

interface CardZoomProps {
  card: CardInstance | null
}

export function CardZoom({ card }: CardZoomProps) {
  if (!card || card.faceDown) return null

  const showBack = card.showBack && card.imgBack
  const img = showBack ? card.imgBack : card.img
  const name = showBack ? (card.backName || card.name) : card.name
  const type = showBack ? (card.backType || card.typeLine) : card.typeLine
  const pw = showBack ? card.backPower : card.power
  const tg = showBack ? card.backTough : card.tough
  const counters = Object.entries(card.counters || {}).filter(([, v]) => v > 0)

  return (
    <div 
      className={cn(
        'fixed right-4 top-1/2 -translate-y-1/2 z-[8000]',
        'pointer-events-none flex flex-col gap-3',
        'animate-slide-up'
      )}
    >
      {/* Card image */}
      <div className="w-48 h-[268px] rounded-lg overflow-hidden card-shadow border border-border/50">
        <CardImage src={img} alt={name} fallbackText={name} />
      </div>

      {/* Card info panel */}
      <div className="glass rounded-lg p-3 w-48 border border-border/30">
        <h3 className="font-bold text-foreground text-sm mb-1 leading-tight">
          {name}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          {type}
        </p>

        {card.manaCost && (
          <div className="flex items-center gap-2 mb-2">
            <ManaSymbols cost={card.manaCost} size={14} />
            <span className="text-xs text-muted-foreground">
              CMC {card.cmc}
            </span>
          </div>
        )}

        {card.oracle && (
          <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/30 pt-2 max-h-20 overflow-hidden">
            {card.oracle}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
          {pw != null && (
            <span className="text-sm font-bold text-amber-400">
              {pw}/{tg}
            </span>
          )}
          {card.loyalty != null && (
            <span className="text-sm font-bold text-blue-400 flex items-center gap-1">
              <span className="text-xs">L</span>{card.loyalty}
            </span>
          )}
          <span 
            className="text-xs ml-auto font-medium"
            style={{ color: getRarityColor(card.rarity) }}
          >
            {card.set}
          </span>
        </div>

        {counters.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/30">
            {counters.map(([type, val]) => (
              <span
                key={type}
                className={cn(
                  'text-xs px-2 py-0.5 rounded bg-secondary font-medium',
                  type === '+1/+1' && 'text-emerald-400',
                  type === '-1/-1' && 'text-red-400',
                  type !== '+1/+1' && type !== '-1/-1' && 'text-violet-400'
                )}
              >
                {type}: {val}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
