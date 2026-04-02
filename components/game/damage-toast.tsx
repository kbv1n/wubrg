'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { PlayerPalette } from '@/lib/game-types'

interface DamageToastProps {
  playerName: string
  damage: number
  pal: PlayerPalette
  onDone: () => void
}

export function DamageToast({ playerName, damage, pal, onDone }: DamageToastProps) {
  const [visible, setVisible] = useState(true)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, 2500)
    return () => clearTimeout(timer)
  }, [damage, onDone])

  const isHealing = damage < 0
  const absValue = Math.abs(damage)

  return (
    <div
      className={cn(
        'liquid-glass-readable rounded-xl px-4 py-3 transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      )}
      style={{
        borderColor: isHealing ? '#10b981' : pal.accent,
        boxShadow: `0 0 20px ${isHealing ? 'rgba(16, 185, 129, 0.3)' : `${pal.glow}40`}`,
      }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ 
            background: isHealing ? 'rgba(16, 185, 129, 0.2)' : `${pal.accent}20`,
            color: isHealing ? '#10b981' : pal.accent 
          }}
        >
          {isHealing ? '+' : '-'}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {playerName}
          </p>
          <p className="text-xs" style={{ color: isHealing ? '#10b981' : pal.accent }}>
            {isHealing ? `Gained ${absValue} Life` : `Has Taken ${absValue} Damage`}
          </p>
        </div>
      </div>
    </div>
  )
}

// Toast container positioned below action bar (at center of screen)
interface DamageToastContainerProps {
  toasts: Array<{
    id: string
    playerName: string
    damage: number
    pal: PlayerPalette
  }>
  onRemove: (id: string) => void
}

export function DamageToastContainer({ toasts, onRemove }: DamageToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9990] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <DamageToast 
            playerName={t.playerName}
            damage={t.damage}
            pal={t.pal}
            onDone={() => onRemove(t.id)}
          />
        </div>
      ))}
    </div>
  )
}
