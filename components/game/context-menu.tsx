'use client'

import { cn } from '@/lib/utils'
import type { CardInstance, PlayerPalette, ZoneType } from '@/lib/game-types'

interface ContextMenuProps {
  x: number
  y: number
  card: CardInstance | null
  zone: ZoneType
  pal: PlayerPalette
  onAction: (action: string) => void
}

interface MenuItem {
  label: string
  action: string
  color?: string
  icon?: string
}

export function ContextMenu({ x, y, card, zone, pal, onAction }: ContextMenuProps) {
  const isBF = zone === 'battlefield'
  const isHand = zone === 'hand'
  const isCmd = zone === 'command'

  const items: MenuItem[] = ([
    isBF ? {
      label: card?.tapped ? 'Untap' : 'Tap',
      action: 'tap',
      color: '#f59e0b',
      icon: card?.tapped ? '↩' : '↪'
    } : null,
    !isBF ? { label: 'Play to Battlefield', action: 'toBF', color: '#10b981', icon: '⚔' } : null,
    isBF ? { label: 'Return to Hand', action: 'toHand', icon: '✋' } : null,
    (isBF || isHand) ? { label: 'Send to Graveyard', action: 'toGrave', color: '#ef4444', icon: '💀' } : null,
    (isBF || isHand) ? { label: 'Exile', action: 'toExile', color: '#a78bfa', icon: '✦' } : null,
    !isCmd ? { label: 'Top of Library', action: 'toLib', color: '#3b82f6', icon: '📚' } : null,
    (card?.mdfc && isBF) ? { label: 'Transform', action: 'flip', color: '#3b82f6', icon: '🔄' } : null,
    (isBF || isHand) ? { label: 'Toggle Face Down', action: 'fd', icon: '👁' } : null,
    isBF ? { label: 'Counters', action: 'ctr', color: '#a78bfa', icon: '🔢' } : null,
    isBF ? { label: 'Duplicate', action: 'dup', icon: '📋' } : null,
  ] as (MenuItem | null)[]).filter((i): i is MenuItem => i !== null)

  // Position menu to stay on screen - constrained to viewable area
  const menuWidth = 208
  const menuHeight = items.length * 40 + 64
  const viewW = typeof window !== 'undefined' ? window.innerWidth : 1200
  const viewH = typeof window !== 'undefined' ? window.innerHeight : 800
  const px = Math.max(8, Math.min(x, viewW - menuWidth - 8))
  const py = Math.max(8, Math.min(y, viewH - menuHeight - 8))

  return (
    <div
      className="fixed z-[9999] animate-slide-up"
      style={{ left: px, top: py }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className={cn(
          'w-52 rounded-xl overflow-hidden',
          'liquid-glass-readable'
        )}
      >
        {/* Card header */}
        {card && (
          <div 
            className="px-4 py-3 border-b border-white/10"
            style={{ background: `${pal.accent}20` }}
          >
            <p className="font-semibold text-sm" style={{ color: pal.accent }}>
              {card.faceDown ? 'Face-down Card' : card.name}
            </p>
            {!card.faceDown && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.typeLine}
              </p>
            )}
          </div>
        )}

        {/* Menu items */}
        <div className="py-1">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => onAction(item.action)}
              className={cn(
                'w-full text-left px-4 py-2 text-sm font-medium',
                'flex items-center gap-2',
                'hover:bg-white/10 transition-colors duration-100'
              )}
              style={{ color: item.color || '#d1d5db' }}
            >
              <span className="text-base w-5">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
