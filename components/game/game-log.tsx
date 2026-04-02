'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, Scroll } from 'lucide-react'

interface GameLogProps {
  entries: string[]
  open: boolean
  onToggle: () => void
}

export function GameLog({ entries, open, onToggle }: GameLogProps) {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0
    }
  }, [entries.length])

  // Get color based on log entry type
  const getEntryColor = (entry: string): string => {
    if (entry.startsWith('🔄')) return 'text-amber-400'
    if (entry.startsWith('💀')) return 'text-red-400'
    if (entry.startsWith('🃏')) return 'text-emerald-400'
    if (entry.startsWith('⚡')) return 'text-blue-400'
    if (entry.startsWith('⚔')) return 'text-violet-400'
    if (entry.startsWith('🔮')) return 'text-purple-400'
    if (entry.startsWith('🎲')) return 'text-amber-300'
    if (entry.startsWith('🪙')) return 'text-yellow-400'
    if (entry.startsWith('✅')) return 'text-emerald-400'
    return 'text-muted-foreground'
  }

  return (
    <div
      className={cn(
        'transition-all duration-200 ease-out',
        'liquid-glass border-l border-white/5',
        'flex flex-col overflow-hidden flex-shrink-0 relative z-2',
        open ? 'w-56 min-w-56' : 'w-9 min-w-9'
      )}
    >
      {/* Header / Toggle */}
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-2 px-3 py-2.5',
          'border-b border-white/5 cursor-pointer',
          'hover:bg-white/5 transition-colors',
          'select-none flex-shrink-0'
        )}
      >
        {open ? (
          <>
            <Scroll className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary flex-1 text-left">
              Game Log
            </span>
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Scroll className="w-4 h-4 text-primary" />
          </div>
        )}
      </button>

      {/* Log entries */}
      {open && (
        <div
          ref={logRef}
          className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar"
        >
          {entries.length === 0 ? (
            <p className="text-muted-foreground/50 text-xs text-center py-4">
              No events yet
            </p>
          ) : (
            <div className="space-y-0.5">
              {entries.map((entry, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-xs py-1.5 px-2 rounded leading-relaxed',
                    i === 0 && 'bg-white/5 font-medium',
                    getEntryColor(entry)
                  )}
                >
                  {entry}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
